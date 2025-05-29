// DOM Elements
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const modal = document.getElementById("limit-modal");
const resetButton = document.getElementById("reset-button");

// === Configuration Section ===
// TODO: Replace with your own Cloudflare Worker URL
const workerUrl = "https://ai.mochammadnopalattasya.workers.dev/";

// Max message exchanges before conversation resets (user + AI = 1 exchange)
const MAX_MESSAGES = 50;

// Conversation history will be stored here (for memory context)
const conversationHistory = [];

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addMessage(message, sender) {
  const msgEl = document.createElement("div");
  msgEl.classList.add("message", `${sender}-message`);
  const bubble = document.createElement("div");
  bubble.classList.add("message-bubble");

  if (sender === "ai") {
    const rawHtml = marked.parse(message);
    const sanitized = DOMPurify.sanitize(rawHtml);
    bubble.innerHTML = sanitized;
    enhanceCodeBlocks(bubble);
  } else {
    bubble.textContent = message;
  }

  msgEl.appendChild(bubble);
  chatMessages.appendChild(msgEl);
  scrollToBottom();
}

function addTypingIndicator() {
  const typingEl = document.createElement("div");
  typingEl.classList.add("message", "ai-message");
  typingEl.id = "typing-indicator";

  const bubble = document.createElement("div");
  bubble.classList.add("message-bubble");

  const dots = document.createElement("div");
  dots.classList.add("typing-dots");
  dots.innerHTML = "<span></span><span></span><span></span>";

  bubble.appendChild(dots);
  typingEl.appendChild(bubble);
  chatMessages.appendChild(typingEl);
  scrollToBottom();
}

function removeTypingIndicator() {
  const typing = document.getElementById("typing-indicator");
  if (typing) typing.remove();
}

function enhanceCodeBlocks(container) {
  const blocks = container.querySelectorAll("pre code");
  blocks.forEach(block => {
    hljs.highlightElement(block);
    const pre = block.closest("pre");
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-button";
    copyBtn.textContent = "Copy";
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(block.innerText);
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
    };
    pre.appendChild(copyBtn);
  });
}

function showLimitModal() {
  modal.style.display = "flex";
}

function resetConversation() {
  conversationHistory.length = 0;
  chatMessages.innerHTML = "";
  addMessage("Hello! I'm your AI assistant. Type something to start chatting...", "ai");
  modal.style.display = "none";
}

async function sendMessageToAI(userMessage) {
  conversationHistory.push({ role: "user", content: userMessage });

  if (conversationHistory.length > MAX_MESSAGES * 2) {
    showLimitModal();
    return;
  }

  // === AI personality and context prompt ===
  // You can customize the system prompt below to change how the AI behaves
  const prompt = [
    "You are AIAssistant, a smart and friendly AI developed using Google's Gemini API, customized by the developer.",
    ...conversationHistory.map(m => m.role === "user" ? `User: ${m.content}` : `AI: ${m.content}`),
    "AI:"
  ].join("\n");

  addTypingIndicator();

  try {
    const res = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const data = await res.json();
    const aiReply = data.reply || "Sorry, an error occurred.";
    conversationHistory.push({ role: "assistant", content: aiReply });
    removeTypingIndicator();
    addMessage(aiReply, "ai");
  } catch (e) {
    console.error(e);
    removeTypingIndicator();
    addMessage("An error occurred while contacting the AI.", "ai");
  }
}

function handleUserMessage() {
  const text = userInput.value.trim();
  if (!text) return;
  addMessage(text, "user");
  sendMessageToAI(text);
  userInput.value = "";
}

sendButton.addEventListener("click", handleUserMessage);
userInput.addEventListener("keypress", e => {
  if (e.key === "Enter") handleUserMessage();
});
resetButton.addEventListener("click", resetConversation);

// Start greeting
addMessage("Hello! I'm your AI assistant. Type something to start chatting...", "ai");
