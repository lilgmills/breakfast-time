import { confirmationPopUp } from './confirmationPopup.js'

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
    
    const cloneDeleteButton = SVGdelete.cloneNode(true);
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
        let data = await response.json();
    
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

const temporaryDeleteListener = (id_delete, deletedName) => {
    return async () => {
        
        const deleteResult = await requestItemDeletion(id_delete)
        
        console.log("deleteResult:", deleteResult)
        
        if(deleteResult.success) {
            closeDeleteModal();
            confirmationPopUp(`${deletedName} was deleted`)
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


const createRecipeWarning = async (ingredient_id)=> {
    const deletedName = document.querySelector(`#${ingredient_id} > .ingredient-name > p`).textContent;
        
    let deleteWarning = [`You are about to delete "${deletedName}" permanently from the inventory.`]
        
    try { 
        // this returns a list of names of recipes that use the ingredient
        const deleteIngredientsFromThese = await fetch(`ingredients/from/${ingredient_id.slice(1)}`)
        let responseData = await deleteIngredientsFromThese.json();
        let reqList = responseData.breakfasts.required_for
        let optList = responseData.breakfasts.optional_for
        console.log("Required for " + String(reqList.length), responseData.breakfasts.required_for)
        console.log("Optional for " + String(optList.length), responseData.breakfasts.optional_for)
        
        if(reqList.length > 0) {
            deleteWarning.push(`"${deletedName}" is required for these recipes:`)
            for(let recipe of reqList) {
                deleteWarning.push(`- ${recipe.breakfast_name}`)
            }
        }
        if(optList.length > 0) {
            deleteWarning.push(`"${deletedName}" is optional for these recipes:`)
            for(let recipe of optList) {
                deleteWarning.push(`- ${recipe.breakfast_name}`)
            }
        }
        if(reqList == 0 && optList == 0) {
            deleteWarning.push("This ingredient is not used in any recipes.")
        }
        
    }
    catch(error) {
        console.error(error);
        // in this case, use the default warning message
        // list of lines, for formatting
        const defaultIngredientDeleteWarning = "Are you sure you want to proceed?";
        deleteWarning.push(defaultIngredientDeleteWarning);
        return deleteWarning;
    }

    return deleteWarning;
}

function activateDeleteModal(ingredient_id){
    return async ()=> {
        console.log("delete modal activated for ID=" + ingredient_id);
        modalBackdrop.style.visibility = "visible";

        confirmModal.style.visibility = "visible";
        
        function writeDeleteWarning(lineList) {
            const textContainer = confirmModal.querySelector("div")
            if(lineList.length == 0) {
                textContainer.innerHTML = "";
            }
            for(let line of lineList) {
                const newLine = document.createElement("div");
                newLine.textContent = line;
                textContainer.append(newLine)
            }
        }
        writeDeleteWarning([])

        modalCreateItem.style.visibility = "hidden";

        const deleteWarning = await createRecipeWarning(ingredient_id);
        writeDeleteWarning(deleteWarning);
        
        const deletedName = document.querySelector(`#${ingredient_id} > .ingredient-name > p`).textContent;
        thisDeleteEventListener = temporaryDeleteListener(ingredient_id, deletedName);

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
const closeCreateModal = () => {
    modalBackdrop.style.visibility = "hidden";
    createItemModal.style.visibility = "hidden";

    createItemModal.querySelectorAll("input[type=checkbox]").forEach(b=>b.checked = false);
    createItemModal.querySelector("input[type=text]").value = "";
}

addItemToInventoryButton.addEventListener("click", (event)=>{
    modalBackdrop.style.visibility = "visible";
    createItemModal.style.visibility = "visible";
    const textInput = createItemModal.querySelector("input[type=text]")
    modalBackdrop.addEventListener("click", (event)=>{
        if(!createItemModal.contains(event.target)) {
            
            // close the modal if the user clicks outside
            modalBackdrop.style.visibility = "hidden";
            createItemModal.style.visibility = "hidden";
            
            createItemModal.querySelectorAll("input[type=checkbox]").forEach(b=>b.checked = false);
            textInput.value = "";
        }
    })

    cancelCreateItem.addEventListener("click", (event)=>{
        modalBackdrop.style.visibility = "hidden";
        createItemModal.style.visibility = "hidden";
        
        createItemModal.querySelectorAll("input[type=checkbox]").forEach(b=>b.checked = false);
        createItemModal.querySelector("input[type=text]").value = "";
    })

    textInput.focus();
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


function populateErrorNotification(errorNotificationMessage) {
    if (catchTimeout) {
        clearTimeout(catchTimeout)
    }
    const errorNotificationText = document.querySelector("#error-notification");
    errorNotificationText.textContent = errorNotificationMessage;
    const errorNotificationDashboard = document.querySelector("#error-notification-slide-dashboard")
    errorNotificationDashboard.classList.replace("inactive", "active");
    const fadeOff = ()=>{
        errorNotificationDashboard.classList.replace("active", "inactive");
    }

    return setInterval(fadeOff, 5000)
}

let catchTimeout;

const newItemCreation = async (event)=>{
    // You need to refactor this, man.
    let errorInCreate = 0;
    let specificErrorInfo = "";
    const newName = createItemModal.querySelector("input[type=text]").value.trim();
    const addShoppingList = createItemModal.querySelector("#add-to-shopping-list").checked;
    const inInventory = createItemModal.querySelector("#new-item-in-inventory").checked ? "1" : "0";
    const textInputCreateItem = createItemModal.querySelector("input[type=text]")
    
    if(newName === "") {
        const errorMessage = "Please enter a name for the ingredient"
        populateErrorMessageForItemCreation(errorMessage)
        textInputCreateItem.focus()
        return;
    }
    let duplicatesOK = true;
    try {
        // returns true if no duplicates are found
        duplicatesOK = await checkForDuplicatesOK(newName);
    }
    catch (error) {
        console.error(error, "There was an error in checking for duplicates");
        errorInCreate += 1;
        specificErrorInfo = "checking duplicates ";
    }

    if(!duplicatesOK) {
        console.log("User entered a duplicate item.")
        const errorMessage = "There is already an ingredient with this name"
        populateErrorMessageForItemCreation(errorMessage);
        textInputCreateItem.focus()
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
        
        let data = await response.json()

        console.log("data", data)
        if (response.ok) {
            console.log("Request was made successfully");
        } else {
            console.error("Request failed:", response.status);
            errorInCreate += 1;
            specificErrorInfo = "making request to server "
        }

        console.log("\"data\".success:", data.success);

        if(data.success) {
            const new_id = data.new_id;
            let shoppingResponse = addShoppingList ? await requestAddToShoppingList(`_${new_id}`) : true;
            
            console.log("shopping list update OK for " + new_id + "?", shoppingResponse)
            if (shoppingResponse) {
                createNewTableRow(new_id, newName, addShoppingList, inInventory);
                
                closeCreateModal();
                
                const message = "Ingredient was successfully created"
                confirmationPopUp(message)

                // this should belong to a reset() function
                createItemModal.querySelector("#input-error-feedback").textContent = "";
            }
            else {
                console.log(shoppingResponse);
                errorInCreate += 1;
                specificErrorInfo = "adding to shopping list "
            }
                
        }
        else {
            console.log(data.message);
            errorInCreate += 1;
            specificErrorInfo = "adding to shopping list "
        }
    }
    catch(error) {
        console.error(error, "Error creating new item.");
        if(errorInCreate) {
            const errorNotificationMessage = `There was an error ${errorInCreate > 1 ? "" : specificErrorInfo}and item could not be created`;
            catchTimeout = populateErrorNotification(errorNotificationMessage);
            closeCreateModal();
        }
    }
    
}

createSubmit.addEventListener("click", async (event)=>{
    await newItemCreation()
})

const textInputCreateItem = createItemModal.querySelector("input[type=text]")
textInputCreateItem.addEventListener('keydown', async (event) => {if (event.key === 'Enter') await newItemCreation()})


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
