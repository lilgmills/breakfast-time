const allRows = document.querySelectorAll('tr.ingredient-inventory-display');
const confirmModal = document.querySelector("#modal-are-you-sure");
const modalBackdrop = document.querySelector('#modal-backdrop');
const modalCreateItem = document.querySelector('#modal-create-inventory-item');


const cachedSVGClone = document.querySelector("svg");
cachedSVGClone.style.visibility = "hidden";

function createNewTableRow(new_id, newName, addShoppingList, inInventory) {
    // create the p tag for the ingredient name
    const nameText = document.createElement('p');
    nameText.textContent = newName;
    
    const classIngredName = document.createElement('td');
    classIngredName.className = "ingredient-name";
    classIngredName.append(nameText);

    const tableRow = document.createElement('tr');
    tableRow.id = "_" + String(new_id);
    tableRow.className = "ingredient-inventory-display"
    tableRow.append(classIngredName);

    let shoppingStateElement;
    // append the shopping_list element

    
    if(addShoppingList) {

        shoppingStateElement = cachedSVGClone.cloneNode(true);
        shoppingStateElement.style.visibility = "visible";
    }
    else {
        shoppingStateElement = document.createElement("div");
        shoppingStateElement.className = "grey-outline";
    }
    
    const checkDetectClick = document.createElement('div');
    checkDetectClick.className = "check-detect-click"
    checkDetectClick.append(shoppingStateElement)
    checkDetectClick.addEventListener("click", (event)=> {
        toggleShoppingCheckmark(event)
        if (checkDetectClick.querySelector('svg')) {
            requestDeleteFromShoppingList(tableRow.id);
            whiteToGrey(checkDetectClick);
        }
        else if (checkDetectClick.querySelector('.grey-outline')) {
            requestAddToShoppingList(tableRow.id);
            greyToWhite(checkDetectClick);
        }
    });
    

    const blueCheckBackground = document.createElement("div");
    blueCheckBackground.className = "blue-check-background";
    blueCheckBackground.style="display:flex;justify-content:space-around;"

    blueCheckBackground.append(checkDetectClick);    
    
    const onShoppingList = document.createElement('td');
    onShoppingList.className = "on-shopping-list"
    onShoppingList.append(blueCheckBackground);

    tableRow.append(onShoppingList);

    const toggleDiv = document.createElement('div');
    toggleDiv.textContent = inInventory == "1" ? "Yes" : "No";
    toggleDiv.className = inInventory == "1" ? "true-in-inventory toggle" : "false-in-inventory toggle";
    toggleDiv.addEventListener("click", (event)=>toggleInInventory(event))
    
    const tdInInventory = document.createElement('td');
    tdInInventory.className = "ingredient-in-inventory";
    tdInInventory.append(toggleDiv)
    tableRow.append(tdInInventory)

    const SVGdelete = document.querySelector('.delete-ingredient-from-inventory');
    
    const cloneDeleteButton = SVGdelete.cloneNode(deep=true);
    cloneDeleteButton.querySelector('.delete-button-background')
        .addEventListener("click", activateDeleteModal(tableRow.id));
    
    
    tableRow.append(cloneDeleteButton)

    document.querySelector('tbody').append(tableRow)

}

function toggleShoppingCheckmark(event) {
    if (event.target.querySelector('.check-blue-svg')) {
        whiteToGrey(event.target);
    }
    else if (event.target.querySelector('.grey-outline')) {
        greyToWhite(event.target);
    }

    console.log(event.target)
}

function toggleInInventory(event) {
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
// send request item deletion the formatted id (id=_41)
const requestItemDeletion = async (ingredient_id) => {
    try {
        const response = await fetch(`/inventory/delete/${ingredient_id.slice(1)}`);
        data = await response.json();
    
        return data
    }
    catch(error) {
        console.error(`${error}\nThere was an error with deleting item ${ingredient_id}`);
    }
}

const requestAddToShoppingList = async (ingredient_id) => {
    try {
        const response = await fetch('/add_shopping_items', {
            method: "POST",
            body: JSON.stringify({
                items: [ingredient_id.slice(1)],
            }),
            headers: {
                "Content-Type": "application/json"
            },
            redirect: "manual"
        })

        
        const data = await response.json()
        
        
        if (data.success) {
            console.log("Shopping list successfully updated!");
            return true;
        } else {
            console.error("Request failed:", response.status);
            return false;
        }
    }
    catch (error) {
        console.error("Error sending shopping list");
        return false;
    }
}

const requestDeleteFromShoppingList = async (ingredient_id) => {
    try {
        const response = await fetch('/remove_shopping_item', {
            method: "POST",
            body: JSON.stringify({
                ingredient_id: ingredient_id.slice(1),
            }),
            headers: {
                "Content-Type": "application/json"
            },
            redirect: "manual"
        })

        
        const data = await response.json()
        
        if (data.success) {
            console.log(`Shopping list successfully updated. ID = ${ingredient_id} was deleted`);
            return true;
        } else {
            console.error("Request failed:", response.status);
        }
    }
    catch (error) {
        console.error("Error sending shopping list")
    }
}

const closeDeleteModal = ()=>{
    confirmModal.querySelector("#confirm-deletion").removeEventListener("click", thisDeleteEventListener)
    modalBackdrop.style.visibility = "hidden";
    confirmModal.style.visibility = "hidden";
}

const temporaryDeleteListener = (id_delete) => {
    return async () => {
        
        const deleteResult = await requestItemDeletion(id_delete)
        
        console.log("deleteResult:", deleteResult)
        
        if(deleteResult.success) {
            closeDeleteModal();
            document.querySelector(`#${id_delete}`)?.remove();
        }
    }
}
// create an event handler for the delete confirmation
// the id is not an argument of the actual event handler
// temporaryDeleteListener creates an event handler
// with a parameter ingredient_id, that we then save a reference to.
//  It is removed when the modal closes
let thisDeleteEventListener; 

function activateDeleteModal(ingredient_id){
    return async ()=> {
        console.log("delete modal activated for ID=" + ingredient_id);
        modalBackdrop.style.visibility = "visible";
        confirmModal.style.visibility = "visible";
        modalCreateItem.style.visibility = "hidden";

        thisDeleteEventListener = temporaryDeleteListener(ingredient_id);

        confirmModal.querySelector("#confirm-deletion")
            .addEventListener("click", thisDeleteEventListener);
        
        // other event listeners for the delete modal buttons are created
        confirmModal.querySelector('#cancel-deletion')
            .addEventListener("click", closeDeleteModal);
    }
}

modalBackdrop.addEventListener("click", (event)=>{
    if(!confirmModal.contains(event.target)) {
        closeDeleteModal()
    }
})

allRows.forEach((tr)=>{
    const ingredient_id = tr.id;
    tr.querySelector('.delete-button-background').addEventListener("click", activateDeleteModal(ingredient_id))
})

const toggles = document.querySelectorAll('.toggle');

toggles.forEach((toggle)=>{
    toggle.addEventListener("click", (event)=>toggleInInventory(event))
});

allRows.forEach((row)=>{

    const ingredient_id = row.id;

    // event handlers for the toggles
    const clickable = row.querySelector(".check-detect-click")
    clickable.addEventListener("click", ()=>{
        if (clickable.querySelector('svg')) {
            requestDeleteFromShoppingList(ingredient_id);
            whiteToGrey(clickable);
        }
        else if (clickable.querySelector('.grey-outline')) {
            requestAddToShoppingList(ingredient_id);
            greyToWhite(clickable);
        }
    })
    
    
    row.querySelector('.toggle').addEventListener("click", async (event)=>{
        event.preventDefault();
        try {
            const response = await fetch(`/inventory/${ingredient_id.slice(1)}`);
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


async function checkForDuplicatesOK(ingredientName) {
    const response = await fetch("inventory/duplicates", {
        method: "POST",
        body: JSON.stringify({
            "name": ingredientName,
        }),
        headers: {
            "Content-Type":"application/json",
        }
    })
    const data = await response.json()
    return data.valid;
}

function populateErrorMessageForItemCreation(errorMessage) {
    const errorFeedback = document.querySelector("#input-error-feedback");
    errorFeedback.style.visibility = "visible";
    errorFeedback.textContent = errorMessage;
    setInterval(()=>{
        errorFeedback.textContent = "";
        errorFeedback.style.visibility = "hidden";
    },15000)
}

createSubmit.addEventListener("click", async (event)=>{
    // You need to refactor this, man.
    const newName = createItemModal.querySelector("input[type=text]").value.trim();
    const addShoppingList = createItemModal.querySelector("#add-to-shopping-list").checked;
    const inInventory = createItemModal.querySelector("#new-item-in-inventory").checked ? "1" : "0";
    
    if(newName === "") {
        const errorMessage = "Please enter a name for the ingredient"
        populateErrorMessageForItemCreation(errorMessage)
        return;
    }
    let duplicatesOK = false;
    try {
        // returns true if no duplicates are found
        duplicatesOK = await checkForDuplicatesOK(newName);
    }
    catch {
        console.log("There was an error while checking for duplicates")
    }

    if(!duplicatesOK) {
        console.log("User entered a duplicate item.")
        const errorMessage = "There is already an ingredient with this name"
        populateErrorMessageForItemCreation(errorMessage);
        return;
    }
  
    try {
        const response = await fetch("/inventory/create", {
            method:"POST",
            body: JSON.stringify({
                "ingredient_name":newName,
                "in_inventory":inInventory
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

        console.log("\"data\".success:", data.success);

        if(data.success) {
            

            const new_id = data.new_id;
            let shoppingResponse = addShoppingList ? await requestAddToShoppingList(`_${new_id}`) : true;
            
            console.log("shopping list update OK for " + new_id + "?", shoppingResponse)
            if (shoppingResponse) {
                createNewTableRow(new_id, newName, addShoppingList, inInventory);
                
                modalBackdrop.style.visibility = "hidden";
                createItemModal.style.visibility = "hidden";
            
                createItemModal.querySelectorAll("input[type=checkbox]").forEach(b=>b.checked = false);
                createItemModal.querySelector("input[type=text]").value = "";

                const popupNotificationDashboard = document.querySelector("#popup-notification-slide-dashboard")
                popupNotificationDashboard.classList.replace("inactive", "active")

                const notifText = popupNotificationDashboard.querySelector('#popup-notification')
                notifText.textContent = "Ingredient was successfully created";
                setTimeout(()=>{
                    popupNotificationDashboard.classList.replace("active", "inactive")
                    setTimeout(()=>{
                        notifText.textContent = "";
                    }, 2000)

                }, 3000)

                // this should belong to a reset() function
                createItemModal.querySelector("#input-error-feedback").textContent = "";
            }
            else {
                console.log(shoppingResponse);
            }
                
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
    clicked.querySelector('.check-blue-svg').remove();
    const greyCircle = document.createElement("div");
    greyCircle.className = "grey-outline";
    clicked.append(greyCircle);    
}

function greyToWhite(clicked) {
    console.log("Grey button. Clicked; it's true")
    clicked.querySelector('.grey-outline').remove();
    const checkBlueSVG = cachedSVGClone.cloneNode(true);
    checkBlueSVG.style.visibility = "visible";
    clicked.append(checkBlueSVG);
}



