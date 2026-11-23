export function confirmationPopUp(message) {
    const popupNotificationDashboard = document.querySelector("#popup-notification-slide-dashboard")
    popupNotificationDashboard.classList.replace("inactive", "active")

    const notifText = popupNotificationDashboard.querySelector('#popup-notification')
    notifText.textContent = message;
    setTimeout(()=>{
        popupNotificationDashboard.classList.replace("active", "inactive")
        setTimeout(()=>{
            notifText.textContent = "";
        }, 2000)

    }, 3000)
}