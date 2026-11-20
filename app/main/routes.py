import os
import csv
from app.main import main
from flask import Flask, render_template, current_app, request, jsonify
import html

def get_path_to_csv_file(f_name):
    return os.path.join(
        current_app.instance_path,
        f_name
    )

def read_csv_file(filename):
    with open(filename, mode='r', newline='', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        rows = list(reader)
                
        # in_inventory is converted to a Boolean when it is read, but it is a string 0/1 when saved
        if "in_inventory" in reader.fieldnames:
            for row in rows:
                row["in_inventory"] = row["in_inventory"].strip() == '1'
                
        return rows
    
def append_csv_file(f_name, fieldnames, record):
    
    #get_path_to_csv assumes that csv is in the "instance" folder
    filename = get_path_to_csv_file(f_name)
    needs_newline = False
    
    with open(filename, mode='rb') as file:
        file.seek(-1, os.SEEK_END)
        last_char = file.read(1)
        if last_char not in (b'\n', b'\r'):
            needs_newline = True
        
    with open(filename, mode='a', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames)
        
        if needs_newline:
            file.write('\n')
            
        writer.writerow(record)
    return
        
    
def load_csv_data(f_name):
    return read_csv_file(get_path_to_csv_file(f_name))



@main.route('/')
def index():
    
    breakfasts = load_csv_data("breakfast.csv")
    ingredients = load_csv_data("ingredient.csv")
    
    # create a lookup dictionary for ingredients
    ingredient_lookup = {
        ingredient["ingredient_id"] : ingredient for ingredient in ingredients
    }
    
    def get_ingredient(id): return ingredient_lookup[id]
    
    breakfast_ingredients = load_csv_data("breakfast_ingredient.csv")
    def select_by_breakfast_from_breakfast_ingredients(breakfast_id): return [_ for _ in breakfast_ingredients if _["breakfast_id"] == breakfast_id]
    
    complete_breakfasts = []
    breakfasts_missing_ingredients = []

    # find breakfasts with missing required ingredients in inventory
    for breakfast in breakfasts:
        
        breakfast_id = breakfast["breakfast_id"]
        
        has_required_ingredients = True
        
        required_ingredients_missing = []
        optional_groups_missing_all = {}
        missing_optional_group_ingredients = []
        
        selected_breakfasts = select_by_breakfast_from_breakfast_ingredients(breakfast_id)

        for breakfast_ingredient in selected_breakfasts:
            
            ingredient = get_ingredient(breakfast_ingredient["ingredient_id"])
            
            if not ingredient["in_inventory"] and not breakfast_ingredient["optional_group"]:
                
                has_required_ingredients = False
                required_ingredients_missing.append(ingredient)
            
        # find optional_group values with all optional ingredients not in inventory
        for breakfast_ingredient in selected_breakfasts:
            
            ingredient = get_ingredient(breakfast_ingredient["ingredient_id"])
            
            if breakfast_ingredient["optional_group"]:
                group_num = breakfast_ingredient["optional_group"]
                if group_num in optional_groups_missing_all:
                    if ingredient["in_inventory"]:
                        optional_groups_missing_all[group_num] = False
                else:
                    if not ingredient["in_inventory"]:
                        optional_groups_missing_all[group_num] = True
                    else: optional_groups_missing_all[group_num] = False
                    
        for optional_group_num, missing in optional_groups_missing_all.items():
            if(missing):
                ingredients_list = []
                for breakfast_ingredient in selected_breakfasts:
                    if breakfast_ingredient["optional_group"] and breakfast_ingredient["optional_group"] == optional_group_num:
                        ingredient = get_ingredient(breakfast_ingredient["ingredient_id"])
                        ingredients_list.append(ingredient)
            
                missing_optional_group_ingredients.append({"optional_group_num": optional_group_num, "ingredients_list": ingredients_list})
            
        
        has_optional_ingredients = all(not _ for _ in list(optional_groups_missing_all.values()))
        if has_required_ingredients and has_optional_ingredients: complete_breakfasts.append(breakfast)
        else:
            breakfasts_missing_ingredients.append({"breakfast": breakfast, "required_ingredients_missing":required_ingredients_missing, "missing_optional_group_ingredients":missing_optional_group_ingredients})
        
    return render_template("index.html", **{"complete_breakfasts":complete_breakfasts, "breakfasts_missing_ingredients":breakfasts_missing_ingredients})

@main.route('/menu')
def menu():
    # read csv the breakfast file
    # pass the breakfasts
    breakfasts = load_csv_data("breakfast.csv")
    return render_template("menu.html", **{"breakfasts": breakfasts})

# view a breakfast's recipe on its own page
@main.route('/menu/<breakfast_id>')
def breakfast(breakfast_id):
    breakfasts = load_csv_data("breakfast.csv")
    for b in breakfasts:
        if b["breakfast_id"] == breakfast_id:
            breakfast = b
            break
    ingredients = load_csv_data("ingredient.csv")
    
    # create a lookup dictionary for ingredients
    ingredient_lookup = {
        ingredient["ingredient_id"] : ingredient for ingredient in ingredients
    }
    
    def get_ingredient(id): return ingredient_lookup[id]
    
    breakfast_ingredients = load_csv_data("breakfast_ingredient.csv")
    def select_by_breakfast_from_breakfast_ingredients(breakfast_id): return [_ for _ in breakfast_ingredients if _["breakfast_id"] == breakfast_id]
    
    selected_breakfast_ingredients = select_by_breakfast_from_breakfast_ingredients(breakfast_id)
    
    required_ingredients = []
    optional_ingredient_groups = {}
    
    for breakfast_ingredient in selected_breakfast_ingredients:
        ingredient_id = breakfast_ingredient["ingredient_id"]
        ingredient = get_ingredient(ingredient_id)
        
        if breakfast_ingredient["optional_group"]:
            if breakfast_ingredient["optional_group"] in optional_ingredient_groups:
                optional_ingredient_groups[breakfast_ingredient["optional_group"]].append(ingredient)
            else:
                optional_ingredient_groups[breakfast_ingredient["optional_group"]] = [ingredient]
        else:
            required_ingredients.append(ingredient)
    
    
    
    return render_template("breakfast.html", **{"breakfast":breakfast, "required_ingredients":required_ingredients, "optional_ingredient_groups":optional_ingredient_groups})

@main.route("/inventory")
def inventory():
    ingredients = load_csv_data("ingredient.csv")
    
    on_shopping_list_ids = [item["ingredient_id"] for item in load_csv_data("shopping_list.csv")]
    print(on_shopping_list_ids)
    ingredients_with_shopping_flag = [{
        "ingredient_id":ingredient["ingredient_id"],
        "ingredient_name":ingredient["ingredient_name"],
        "on_shopping_list":ingredient["ingredient_id"] in on_shopping_list_ids,
        "in_inventory":ingredient["in_inventory"]
    } for ingredient in ingredients]
    
    return render_template("inventory.html", **{"ingredients":ingredients_with_shopping_flag})

@main.route("/inventory/<ingredient_id>", methods=['POST'])
def toggle_inventory(ingredient_id):
    ingredients = load_csv_data("ingredient.csv")
        
    # create a lookup dictionary for ingredients
    ingredient_lookup = {
        ingredient["ingredient_id"] : ingredient for ingredient in ingredients
    }
    
    for ingredient in ingredients:
        ingredient["in_inventory"] = "0" if not ingredient["in_inventory"] else "1"
        if ingredient["ingredient_id"] == ingredient_id:
            ingredient["in_inventory"] = "0" if ingredient["in_inventory"] == "1" else "1"
            
            
            
    with open(get_path_to_csv_file("ingredient.csv"), mode='w', newline='', encoding='utf-8') as file:
        fieldnames=["ingredient_id","ingredient_name","in_inventory"]
        writer = csv.DictWriter(file, fieldnames)
        header_row = [{"ingredient_id":"ingredient_id","ingredient_name":"ingredient_name","in_inventory":"in_inventory"}]
        writer.writerows(header_row + ingredients)
    
    message = "Inventory for {} updated to '{}'. (ingredient_id = {})".format(ingredient_lookup[ingredient_id]["ingredient_name"],
                                                                             "Yes" if ingredient_lookup[ingredient_id] == 1 else "No",
                                                                             ingredient_id)
    
    return jsonify({
            "success":True,
            "message": message
        }), 200
    
@main.route("/inventory/create", methods=['POST'])
def create_new_ingredient():
    ingredients = load_csv_data("ingredient.csv")
    ingredient_lookup = {
        ingredient["ingredient_id"] : ingredient for ingredient in ingredients
    }
    
    #check if name is already in the ingredients list
    #only checks for exact duplicates, non-case sensitive
    
    
    new_name = html.escape(request.get_json()["ingredient_name"])
    
    new_name_not_case_sens = new_name.lower().strip()
    
    if new_name_not_case_sens == "":
        return jsonify({
                        "success":False,
                        "message":"User submitted an empty string"
                        }), 200
    auto_increment = 0
    
    for ingredient in ingredients:
        if new_name_not_case_sens == ingredient["ingredient_id"].lower().strip():
            
            return jsonify({
                "success":False,
                "message":"User submitted a duplicate name"
                }), 200
        auto_increment = max(auto_increment, int(ingredient["ingredient_id"]))
    
    new_id = str(auto_increment+1)
    # add new item to csv
    fieldnames = ["ingredient_id","ingredient_name","in_inventory"]
    new_record = {"ingredient_id":new_id,
                  "ingredient_name":new_name,
                  "in_inventory":request.get_json()["in_inventory"]}
    append_csv_file("ingredient.csv", fieldnames, new_record)
    return jsonify({
        "success":True,
        "new_id":new_id,
        "message":"{} was inserted into inventory".format(new_name)
        }), 200
    
@main.route("/inventory/delete/<ingredient_id>")
def delete_ingredient(ingredient_id):
    ingredients = load_csv_data("ingredient.csv")
    
    # create a lookup dictionary for ingredients
    ingredient_lookup = {
        ingredient["ingredient_id"] : ingredient for ingredient in ingredients
    }
    
    shopping_list = load_csv_data("shopping_list.csv")
    shopping_list_lookup = [item["ingredient_id"] for item in shopping_list]
    rewrite_shopping_list = str(ingredient_id) in shopping_list_lookup
    rewrite_rows = [{"ingredient_id":id} for id in shopping_list_lookup if id != ingredient_id]
    
    breakfast_ingredients = load_csv_data("breakfast_ingredient.csv")
    rewrite_breakfast_csv = [breakfast_ingredient for breakfast_ingredient in breakfast_ingredients if breakfast_ingredient["ingredient_id"] != ingredient_id]
    
    
    if (str(ingredient_id) in ingredient_lookup):
        name = ingredient_lookup[ingredient_id]["ingredient_name"]
        
        rows = [ingredient for ingredient in ingredients if ingredient["ingredient_id"] != str(ingredient_id)]
        print(rows)
        for row in rows:
            row["in_inventory"] = 1 if row["in_inventory"] else 0
        
        try:
            with open(get_path_to_csv_file("ingredient.csv"), mode='w', newline='', encoding='utf-8') as file:
                fieldnames=["ingredient_id","ingredient_name","in_inventory"]
                writer = csv.DictWriter(file, fieldnames)
                header_row = [{"ingredient_id":"ingredient_id","ingredient_name":"ingredient_name","in_inventory":"in_inventory"}]
                writer.writerows(header_row + rows)
                
            with open(get_path_to_csv_file("breakfast_ingredient.csv"), mode='w', newline='', encoding='utf-8') as file:
                fieldnames=["breakfast_id","ingredient_id","optional_group"]
                writer = csv.DictWriter(file, fieldnames)
                header_row = [{"breakfast_id":"breakfast_id","ingredient_id":"ingredient_id","optional_group":"optional_group"}]
                writer.writerows(header_row + rewrite_breakfast_csv)
                
            if rewrite_shopping_list:
                with open(get_path_to_csv_file("shopping_list.csv"), mode='w', newline='', encoding='utf-8') as file:
                    fieldnames= ["ingredient_id"]
                    writer = csv.DictWriter(file, fieldnames)
                    header_row = [{"ingredient_id":"ingredient_id"}]
                    writer.writerows(header_row + rewrite_rows)
                    
            response = jsonify({
                    "success": True,
                    "message": "ID = {} deleted ({})".format(ingredient_id, name)
                })
        except:
            response = jsonify({
                    "success": False,
                    "message": "Error occured. ID = {} was not deleted ({})".format(ingredient_id, name)
                })
        
    else:
        print("Error message: we could not find {}".format(ingredient_id))
        response = jsonify({
                "success": False,
                "message": "ID = {} was not found and could not be deleted".format(ingredient_id)
            })   
    
    return response
    

@main.route("/shopping")
def shopping():
    shopping_list = load_csv_data("shopping_list.csv")
    ingredients = load_csv_data("ingredient.csv")
    
    ingredient_lookup = {
        ingredient["ingredient_id"] : ingredient for ingredient in ingredients
    }
    
    shopping_list_ingredients = [ingredient_lookup[shopping_item["ingredient_id"]] for shopping_item in shopping_list]
    
    return render_template("shopping.html",
                           **{"shopping_list": shopping_list_ingredients})

# put a new ingredient on the shopping list by its id
@main.route('/add_shopping_items', methods=['POST'])
def add_to_shopping_list():
    data = request.get_json()
    new_shopping_items = data.get("items", [])
    
    new_shopping_items = list(set(new_shopping_items))
    
    shopping_list = [row["ingredient_id"] for row in load_csv_data("shopping_list.csv")]
    print(shopping_list)
    
    fieldnames = ["ingredient_id"]
    
    try: 
        for ingredient_id in new_shopping_items:
            if ingredient_id not in shopping_list:
                record = {"ingredient_id": ingredient_id}
                append_csv_file("shopping_list.csv", fieldnames, record)
    except: 
        return jsonify({
            "success":False,
            "message": "Error updating shopping list."
        }), 200
        
    
    
    return jsonify({
        "success":True,
        "message": "Shopping list updated"
    }), 200
    
    
@main.route('/remove_shopping_item', methods=['POST'])
def remove_from_shopping_list():
    data = request.get_json()
    # "" is the default value for getting ingredient_id
    remove_shopping_item_id = data.get("ingredient_id", "")
    
    shopping_list = [row["ingredient_id"] for row in load_csv_data("shopping_list.csv")]
    
    response = {
        "success": False,
        "message": "Could not find ID = {}".format(remove_shopping_item_id)    
    }
    
    if remove_shopping_item_id in shopping_list:
        try:
            with open(get_path_to_csv_file("shopping_list.csv"), mode="w", newline="", encoding="utf-8") as file:
                rows = [{"ingredient_id":id} for id in shopping_list if remove_shopping_item_id != id]
                fieldnames = ["ingredient_id"]
                writer = csv.DictWriter(file, fieldnames)
                header_row = [{"ingredient_id":"ingredient_id"}]
                writer.writerows(header_row + rows)
                
                response["success"] = True
                response["message"] = "Item {} was successfully deleted".format(remove_shopping_item_id)
        except:
            response["message"] = "There was an error trying to delete item {}".format(remove_shopping_item_id)
    
    return jsonify(response), 200