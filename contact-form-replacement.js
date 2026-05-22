document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("quoteForm");

  if (!form) {
    console.error("Quote form not found.");
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector('button[type="submit"]');

    const formData = {
      name: document.getElementById("inp-name")?.value.trim(),
      phone: document.getElementById("inp-phone")?.value.trim(),
      email: document.getElementById("inp-email")?.value.trim(),
      product: document.getElementById("inp-prod")?.value.trim(),
      message: document.getElementById("inp-msg")?.value.trim()
    };

    if (!formData.name || !formData.phone || !formData.message) {
      alert("Please fill in your name, phone number, and message.");
      return;
    }

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Sending...";
      }

      const response = await fetch("/api/quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.message || "Unable to send request.");
        return;
      }

      alert("Your quote request has been sent successfully.");
      form.reset();
    } catch (error) {
      console.error("Form submission error:", error);
      alert("Network error. Please try again.");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Send Request";
      }
    }
  });
});