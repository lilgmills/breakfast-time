const copyButton = document.querySelector("#copy-clipboard-button");
const selectFormat = document.getElementById('format-select');
const copyTool = document.getElementById('copy-tool');
const prependLookup = {"plaintext": "", "markdown": "- [ ] ", "list": "- "}

const shoppingItems = Array.from(document.querySelectorAll('.shopping-item'));

const formattedList = shoppingItems.map(item => item.textContent.trim());

const copyNotification = document.getElementById("copied-notification");

selectFormat.addEventListener("change", (event)=>{
    // get the name of the new format
    const formatValue = event.target.value;
    copyTool.className = formatValue;

    const prependSymbol = prependLookup[formatValue]
    for(let i = 0; i < shoppingItems.length; i++) {
        shoppingItems[i].textContent = prependSymbol + formattedList[i]
    }

})

copyButton.addEventListener("click", ()=>{
    
    const copyToolClass = copyTool.className
    const prependSymbol = prependLookup[copyToolClass]
    const PlainText = formattedList.map(item=>prependSymbol + item).join('\n');
    navigator.clipboard.writeText(PlainText);

    copyNotification.className = "copy-triggered"
    
    setTimeout(()=>{
        copyNotification.className = "off";
    }, 2500)
    const body = document.querySelector('body');
    body.appendChild(copiedToClipboard);
})