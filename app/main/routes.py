import os
import csv
from app.main import main
from flask import Flask, render_template, current_app, request, jsonify

def get_path_to_csv_file(f_name):
    return os.path.join(
        current_app.instance_path,
        f_name
    )

def read_csv_file(filename):
    with open(filename, mode='r', newline='', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        rows = list(reader)
                
        if "in_inventory" in reader.fieldnames:
            for row in rows:
                row["in_inventory"] = row["in_inventory"].strip() == '1'
                
        return rows
    
def append_csv_file(f_name, fieldnames, record):
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
    return render_template("inventory.html")

@main.route("/shopping")
def shopping():
    shopping_list = load_csv_data("shopping_list.csv")
    ingredients = load_csv_data("ingredient.csv")
    
    ingredient_lookup = {
        ingredient["ingredient_id"] : ingredient for ingredient in ingredients
    }
    
    return render_template("shopping.html", **{"shopping_list": [ingredient_lookup[shopping_item["ingredient_id"]] for shopping_item in shopping_list]})

# put a new ingredient on the shopping list by its id
@main.route('/add_shopping_items', methods=["POST"])
def add_to_shopping_list():
    data = request.get_json()
    new_shopping_items = data.get("items", [])
    
    new_shopping_items = list(set(new_shopping_items))
    
    shopping_list = [row["ingredient_id"] for row in load_csv_data("shopping_list.csv")]
    print(shopping_list)
    
    fieldnames = ["ingredient_id"]
    
    for ingredient_id in new_shopping_items:
        if ingredient_id not in shopping_list:
            record = {"ingredient_id": ingredient_id}
            append_csv_file("shopping_list.csv", fieldnames, record)
    
    
    return jsonify({
        "success":True,
        "message": "Shopping list updated"
    }), 200