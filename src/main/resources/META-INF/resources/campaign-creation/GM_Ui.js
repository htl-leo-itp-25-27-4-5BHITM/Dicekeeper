const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const chatContent = document.getElementById("chatContent");

// Funktion, um Text in die Chatbox zu senden
function sendMessage() {
    const text = chatInput.value.trim();
    if (text !== "") {
        const message = document.createElement("div");
        message.textContent = "Dungeon Master: " + text;
        message.style.fontStyle = "thin";
        chatContent.appendChild(message);
        chatContent.scrollTop = chatContent.scrollHeight; // nach unten scrollen
        chatInput.value = "";

        // Antwort von "ChatGPT" nach 5 Sekunden
        setTimeout(() => {
            const botMessage = document.createElement("div");
            botMessage.textContent = "Chat GPT noch nicht Implementiert, wird in einem späterem Sprint gemacht";
            botMessage.style.fontStyle = "italic";
            botMessage.style.color = "#333";
            chatContent.appendChild(botMessage);
            chatContent.scrollTop = chatContent.scrollHeight;
        }, 5000);
    }
}

// Enter drücken
chatInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
        sendMessage();
    }
});

// Pfeil-Button klicken
sendBtn.addEventListener("click", sendMessage);
