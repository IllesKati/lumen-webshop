const FILE_RULES = {
  modelFile: {
    allowedExtensions: [".stl", ".3mf", ".obj"],
    label: "modellt",
    selectedLabel: "Kiválasztott fájl",
  },
  imageFile: {
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    label: "képet",
    selectedLabel: "Kiválasztott kép",
  },
};

function validateField(field) {
  const value = field.value.trim();

  if (field.required && !value) {
    return "Ez a mező kötelező.";
  }

  if (field.name === "email" && value && field.validity.typeMismatch) {
    return "Adj meg egy érvényes e-mail címet.";
  }

  if (field.name === "quantity" && value && (!/^\d+$/.test(value) || Number(value) < 1)) {
    return "A darabszám pozitív egész szám legyen.";
  }

  return "";
}

function initCustomOrder() {
  const section = document.querySelector("#custom-order");
  if (!section) return;

  const productModal = document.querySelector("#product-modal");
  const formPanel = section.querySelector("#custom-order-form");
  const form = section.querySelector("[data-custom-order-form]");
  const requestType = form.elements.namedItem("requestType");
  const productName = form.elements.namedItem("product-name");
  const productId = form.elements.namedItem("productId");
  const status = section.querySelector("[data-custom-order-status]");
  const modelUpload = section.querySelector("[data-model-upload]");
  const imageUpload = section.querySelector("[data-image-upload]");
  const closeButton = section.querySelector("[data-custom-order-close]");
  const submitButton = form.querySelector("[data-custom-order-submit]");
  let lastTrigger = null;

  const closeFormPanel = () => {
    formPanel.hidden = true;
    section.querySelectorAll("[data-custom-order-type]").forEach((button) => {
      button.setAttribute("aria-expanded", "false");
    });
    if (lastTrigger?.isConnected) lastTrigger.focus();
  };

  const openFormPanel = (button, focusReturn = button, selectedRequestType = button.dataset.customOrderType) => {
    lastTrigger = focusReturn;
    const name = form.elements.namedItem("name");
    const email = form.elements.namedItem("email");
    const nameValue = name.value;
    const emailValue = email.value;
    form.reset();
    name.value = nameValue;
    email.value = emailValue;
    form.querySelectorAll("[data-error-for]").forEach((errorElement) => {
      errorElement.textContent = "";
    });
    form.querySelectorAll("[data-file-for]").forEach((fileElement) => {
      fileElement.textContent = "";
    });
    form.querySelectorAll("[aria-invalid]").forEach((field) => {
      field.removeAttribute("aria-invalid");
    });
    productName.value = "";
    productId.value = "";
    formPanel.hidden = false;
    section.querySelectorAll("[data-custom-order-type]").forEach((trigger) => {
      trigger.setAttribute("aria-expanded", "false");
    });
    button.setAttribute("aria-expanded", "true");
    requestType.value = selectedRequestType;
    updateUploadFields(requestType.value, modelUpload, imageUpload);
    status.textContent = "";
    formPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    name.focus({ preventScroll: true });
  };

  section.querySelectorAll("[data-custom-order-type]").forEach((button) => {
    button.addEventListener("click", () => openFormPanel(button));
    button.addEventListener("custom-order:open", (event) => {
      openFormPanel(
        button,
        event.detail?.trigger ?? button,
        event.detail?.requestType ?? button.dataset.customOrderType,
      );
    });
  });

  closeButton.addEventListener("click", closeFormPanel);

  document.addEventListener("keydown", (event) => {
    if (formPanel.hidden) return;

    if (event.key === "Escape") {
      closeFormPanel();
      return;
    }

    if (event.key !== "Tab" || !productModal || productModal.hidden) return;

    const focusableElements = [...formPanel.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )].filter((element) => !element.closest("[hidden]"));
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (!firstElement) return;

    if (event.shiftKey && (document.activeElement === firstElement || !formPanel.contains(document.activeElement))) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && (document.activeElement === lastElement || !formPanel.contains(document.activeElement))) {
      event.preventDefault();
      firstElement.focus();
    }
  });

  requestType.addEventListener("change", () => {
    updateUploadFields(requestType.value, modelUpload, imageUpload);
    clearFieldError(form, "requestType");
  });

  Object.entries(FILE_RULES).forEach(([fieldName, rule]) => {
    const input = form.elements.namedItem(fieldName);
    input.addEventListener("change", () => {
      const errorElement = form.querySelector(`[data-error-for="${fieldName}"]`);
      const displayElement = form.querySelector(`[data-file-for="${fieldName}"]`);
      const file = input.files[0];
      clearFieldError(form, fieldName);
      displayElement.textContent = "";

      if (!file) return;

      const extension = file.name.slice(file.name.lastIndexOf(".")).toLocaleLowerCase("en-US");
      if (!rule.allowedExtensions.includes(extension)) {
        input.value = "";
        input.setAttribute("aria-invalid", "true");
        errorElement.textContent = `Nem megfelelő fájlformátum. ${rule.label} ${rule.allowedExtensions.join(", ")} formátumban válaszd ki.`;
        return;
      }

      const formattedSize = file.size < 1024 * 1024
        ? `${Math.max(1, Math.round(file.size / 1024))} KB`
        : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
      displayElement.textContent = `${rule.selectedLabel}: ${file.name} (${formattedSize})`;
    });
  });

  form.addEventListener("input", (event) => {
    if (event.target.name && event.target.name !== "requestType") {
      clearFieldError(form, event.target.name);
    }
    status.textContent = "";
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    status.textContent = "";

    const requiredFields = ["name", "email", "requestType", "description", "quantity"]
      .map((name) => form.elements.namedItem(name));
    let firstInvalidField = null;

    requiredFields.forEach((field) => {
      const message = validateField(field);
      const errorElement = form.querySelector(`[data-error-for="${field.name}"]`);
      errorElement.textContent = message;
      field.setAttribute("aria-invalid", String(Boolean(message)));
      if (message && !firstInvalidField) firstInvalidField = field;
    });

    if (firstInvalidField) {
      firstInvalidField.focus();
      return;
    }

    status.textContent = "Az ajánlatkérő űrlap bemutató módban működik. Az adatok jelenleg nem kerülnek elküldésre.";
  });

  submitButton.disabled = false;
}

function updateUploadFields(requestType, modelUpload, imageUpload) {
  modelUpload.hidden = requestType !== "Saját 3D modell";
  imageUpload.hidden = requestType !== "Egyedi ötlet / fénykép";
}

function clearFieldError(form, fieldName) {
  const errorElement = form.querySelector(`[data-error-for="${fieldName}"]`);
  const field = form.elements.namedItem(fieldName);
  if (!errorElement || !field) return;

  errorElement.textContent = "";
  field.removeAttribute("aria-invalid");
}

export { initCustomOrder };
