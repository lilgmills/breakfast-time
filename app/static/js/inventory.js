const allRows = document.querySelectorAll('tr.ingredient-inventory-display');
const confirmModal = document.querySelector("#modal-are-you-sure");
const modalBackdrop = document.querySelector('#modal-backdrop');
const modalCreateItem = document.querySelector('#modal-create-inventory-item');


const cachedSVGClone = document.querySelector("svg");
cachedSVGClone.style.visibility = "hidden";



function createNewTableRow(new_id, new_name, add_shopping_list, in_inventory) {
    
    
    // create the p tag for the ingredient name
    const nameText = document.createElement('p');
    nameText.textContent = new_name;
    
    const classIngredName = document.createElement('td');
    classIngredName.className = "ingredient-name";
    classIngredName.append(nameText);

    const tableRow = document.createElement('tr');
    tableRow.id = "_" + String(new_id);
    tableRow.className = "ingredient-inventory-display"
    tableRow.append(classIngredName);

    const onShoppingList = document.createElement('td');
    tableRow.append(onShoppingList);

    const toggleDiv = document.createElement('div');
    toggleDiv.textContent = in_inventory == "1" ? "Yes" : "No";
    toggleDiv.className = in_inventory == "1" ? "true-in-inventory toggle" : "false-in-inventory toggle";
    toggleDiv.addEventListener("click", (event)=>toggleToggle(event))
    
    const tdInInventory = document.createElement('td');
    tdInInventory.className = "ingredient-in-inventory";
    tdInInventory.append(toggleDiv)
    tableRow.append(tdInInventory)

    const SVGdelete = document.querySelector('.delete-ingredient-from-inventory');
    
    const cloneDeleteButton = SVGdelete.cloneNode(deep=true);
    cloneDeleteButton.querySelector('.delete-button-background')
        .addEventListener("click", (event)=>activateDeleteModal(event, new_id));
    
    
    tableRow.append(cloneDeleteButton)

    document.querySelector('tbody').append(tableRow)

}

function toggleToggle(event) {
    const toggle = event.target;
    if(toggle.classList.contains("true-in-inventory")) {
        toggle.classList.replace("true-in-inventory", "false-in-inventory")
        toggle.textContent = "No";
    }
    else {
        toggle.classList.replace("false-in-inventory", "true-in-inventory")
        toggle.textContent = "Yes";
    }
}

const requestItemDeletion = async (ingredient_id) => {
    try {
        const response = await fetch(`/inventory/delete/${ingredient_id}`);
        data = await response.json();
    
        return data
    }
    catch(error) {
        console.error("There was an error with deleting item " + ingredient_id);
    }
}

const activateDeleteModal = async (event, ingredient_id) => {
    modalBackdrop.style.visibility = "visible";
    confirmModal.style.visibility = "visible";
    modalCreateItem.style.visibility = "hidden";

    // event listeners for the delete modal buttons are created
    confirmModal.querySelector('#cancel-deletion').addEventListener("click", ()=>{
        modalBackdrop.style.visibility = "hidden";
        confirmModal.style.visibility = "hidden";
    }) 

    confirmModal.querySelector('#confirm-deletion').addEventListener("click", async ()=>{
        const deleteResult = await requestItemDeletion(ingredient_id.slice(1))
        console.log(deleteResult)
        
        if(deleteResult.success) {
            modalBackdrop.style.visibility = "hidden";
            confirmModal.style.visibility = "hidden";
            document.querySelector(`#_${ingredient_id}`)?.remove();
        }        
    })
    


    modalBackdrop.addEventListener("click", (event)=>{
        if(!confirmModal.contains(event.target)) {
            modalBackdrop.style.visibility = "hidden";
            confirmModal.style.visibility = "hidden";
        }
    })
}


    

allRows.forEach((tr)=>{

    const ingredient_id = tr.id;
    tr.querySelector('.delete-button-background').addEventListener("click", (event)=>activateDeleteModal(event, ingredient_id))
})


const toggles = document.querySelectorAll('.toggle');

toggles.forEach((toggle)=>{
    toggle.addEventListener("click", (event)=>toggleToggle(event))
});

allRows.forEach((row)=>{

    const ingredient_id = row.id.slice(1);
    row.querySelector('.toggle').addEventListener("click", async (event)=>{
        event.preventDefault();
        try {
            const response = await fetch(`/inventory/${ingredient_id}`, {
                method:"POST",
                headers: {
                    "Content-Length": 0,
                },
                redirect:"manual"})
            if(response.ok) {
                console.log("Inventory updated successfully.")
            }
            else {
                console.log("Request failed.", response.status);
            }

        } catch (error) {
            console.error("Error updating inventory");
        }

        
            
        
    })
})

const addItemToInventoryButton = document.querySelector('#add-new-inventory-item');
const createItemModal = document.querySelector('#modal-create-inventory-item');
const cancelCreateItem = createItemModal.querySelector("#cancel-creation");
const createSubmit = createItemModal.querySelector('#create-item-submit')

addItemToInventoryButton.addEventListener("click", (event)=>{
    modalBackdrop.style.visibility = "visible";
    createItemModal.style.visibility = "visible";
    modalBackdrop.addEventListener("click", (event)=>{
            if(!createItemModal.contains(event.target)) {
                modalBackdrop.style.visibility = "hidden";
                createItemModal.style.visibility = "hidden";
                
                createItemModal.querySelectorAll("input[type=checkbox]").forEach(b=>b.checked = false);
                createItemModal.querySelector("input[type=text]").value = "";
            }
        })

    cancelCreateItem.addEventListener("click", (event)=>{
        modalBackdrop.style.visibility = "hidden";
        createItemModal.style.visibility = "hidden";
        
        createItemModal.querySelectorAll("input[type=checkbox]").forEach(b=>b.checked = false);
        createItemModal.querySelector("input[type=text]").value = "";
    })
})

createSubmit.addEventListener("click", async (event)=>{
    
    event.preventDefault();

    const new_name = createItemModal.querySelector("input[type=text]").value;
    const add_shopping_list = createItemModal.querySelector("#add-to-shopping-list").checked ? "1" : "0";
    const in_inventory = createItemModal.querySelector("#new-item-in-inventory").checked ? "1" : "0";
    try {
        const response = await fetch("/inventory/create", {
            method:"POST",
            body: JSON.stringify({
                "ingredient_name":new_name,
                "add_shopping_list":add_shopping_list,
                "in_inventory":in_inventory
            }),
            headers: {
                "Content-Type":"application/json",
            },
            redirect: "manual"
        })

        
        data = await response.json()

        console.log("data", data)
        if (response.ok) {
            console.log("Request was made successfully");
        } else {
            console.error("Request failed:", response.status);
        }

        console.log(data.success);

        if(data.success) {
            
            createNewTableRow(data.new_id, new_name, add_shopping_list, in_inventory);
            
            console.log("The error is not with createNewTableRow()")
            modalBackdrop.style.visibility = "hidden";
            createItemModal.style.visibility = "hidden";
        
            createItemModal.querySelectorAll("input[type=checkbox]").forEach(b=>b.checked = false);
            createItemModal.querySelector("input[type=text]").value = "";
        }
        else {
            console.log(data.message);
        }
    }
    catch(error) {
        console.error("Error creating new item.");
    }
})

const whiteToGrey = (clicked) => {
    // console.log("Yup!")
    clicked.classList.replace("white", "grey")
    blueCheck = clicked.querySelector('.check-blue-svg');
    blueCheck.remove();
    const greyCircle = document.createElement("div");
    greyCircle.className = "grey-outline";
    clicked.append(greyCircle);    
}

function greyToWhite(clicked) {
    clicked.classList.replace("grey", "white")
    clicked.querySelector('.grey-outline').remove();
    const checkBlueSVG = cachedSVGClone.cloneNode(true);
    checkBlueSVG.style.visibility = "visible";
    clicked.append(checkBlueSVG);
}



document.querySelectorAll(".on-shopping-list").forEach((td)=>{
    const clickable = td.querySelector(".blue-check-background")
        clickable.addEventListener("click", ()=>{
            console.log(clickable)
            if (clickable.classList.contains("white")) {
                
                whiteToGrey(clickable)
            }
            else if (clickable.classList.contains("grey")) {
                greyToWhite(clickable)
            }
    })
})