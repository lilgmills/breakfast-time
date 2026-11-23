const allChecks = document.querySelectorAll(".shopping-item");
const addItemsButton = document.getElementById("add-items-to-list");
import { confirmationPopUp } from "./confirmationPopup.js";

allChecks.forEach((checkbox)=>{
    checkbox.addEventListener("change", ()=>{
        
        if (document.querySelectorAll(".shopping-item:checked").length > 0) {
            addItemsButton.classList.add("active");
        }
        else {
            addItemsButton.classList.remove("active");
        }
    })
})

// This is for the "select all" button. It queries required ingredients because select all is only for required ingredient

const requiredIngredientsContentParents = document.querySelectorAll(".required-ingredients-content")

requiredIngredientsContentParents.forEach((parent)=>{
    const childCheckboxes = parent.querySelectorAll("input[type=checkbox]");
    const selectAllButton = parent.querySelector(".add-all-button");

    selectAllButton.addEventListener("click", (event)=>{
        event.preventDefault();
        childCheckboxes.forEach((checkbox)=>{
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change'), {bubbles : true});
        })
    })

})

addItemsButton.addEventListener('click', async (event) => {
    event.preventDefault();

    const checkedItems = document.querySelectorAll(".shopping-item:checked");

    const payload = Array.from(checkedItems).map(checkbox=>checkbox.name);
    console.log(JSON.stringify({
                items: payload,
            }))

    try {
        const response = await fetch('/add_shopping_items', {
            method: "POST",
            body: JSON.stringify({
                items: payload,
            }),
            headers: {
                "Content-Type": "application/json"
            },
            redirect: "manual"
        })

        if (response.ok) {
            console.log("Shopping list successfully updated!");
            confirmationPopUp("Shopping list successfully updated!");

        } else {
            console.error(error, "Request failed:", response.status);
        }
    }
    catch (error) {
        console.error(error, "Error sending shopping list")
    }
        
})