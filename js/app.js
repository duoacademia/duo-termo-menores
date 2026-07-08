(function () {
  "use strict";

  const totalSteps = 6;
  const state = {
    step: 0,
    responsavelNome: "",
    responsavelCpf: "",
    logradouro: "",
    numero: "",
    bairro: "",
    cidade: "GARANHUNS",
    uf: "PE",
    telefone: "",
    menorNome: "",
    menorCpf: "",
    menorNascimento: "",
    signaturePad: null,
    signatureDate: null
  };

  const stepCard = document.querySelector("#stepCard");
  const progressLabel = document.querySelector("#progressLabel");
  const progressPercent = document.querySelector("#progressPercent");
  const progressBar = document.querySelector("#progressBar");
  const fieldTemplate = document.querySelector("#fieldTemplate");
  const termTemplate = document.querySelector("#termTemplate");

  const fieldSteps = [
    {
      title: "Responsável legal",
      description: "Informe os dados de quem autoriza a matrícula do menor.",
      fields: [
        { id: "responsavelNome", label: "Nome completo", type: "text", placeholder: "Digite o nome completo", autocomplete: "name" },
        { id: "responsavelCpf", label: "CPF", type: "text", placeholder: "000.000.000-00", inputMode: "numeric", maxLength: 14 }
      ]
    },
    {
      title: "Endereço do responsável",
      description: "Esses dados ficam registrados no termo de autorização.",
      fields: [
        { id: "logradouro", label: "Endereço", type: "text", placeholder: "Rua, avenida..." },
        { id: "numero", label: "Número", type: "text", placeholder: "Número" },
        { id: "bairro", label: "Bairro", type: "text", placeholder: "Bairro" }
      ]
    },
    {
      title: "Cidade e contato",
      description: "Confirme a cidade, UF e telefone do responsável.",
      fields: [
        { id: "cidade", label: "Cidade", type: "text", placeholder: "Garanhuns" },
        {
          id: "uf",
          label: "Estado",
          type: "select",
          placeholder: "UF",
          options: ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]
        },
        { id: "telefone", label: "Telefone", type: "text", placeholder: "(00) 90000-0000", inputMode: "tel", maxLength: 15 }
      ]
    },
    {
      title: "Menor contratante",
      description: "Informe os dados do menor que será matriculado.",
      fields: [
        { id: "menorNome", label: "Nome completo do menor", type: "text", placeholder: "Digite o nome completo", autocomplete: "name" },
        { id: "menorCpf", label: "CPF do menor", type: "text", placeholder: "000.000.000-00", inputMode: "numeric", maxLength: 14 }
      ]
    },
    {
      title: "Nascimento do menor",
      description: "A data de nascimento será registrada no termo.",
      fields: [
        { id: "menorNascimento", label: "Data de nascimento", type: "date" }
      ]
    }
  ];

  function todayText() {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(new Date());
  }

  function timeText() {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(new Date());
  }

  function onlyDigits(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function maskCpf(value) {
    return onlyDigits(value)
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function maskPhone(value) {
    return onlyDigits(value)
      .slice(0, 11)
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
  }

  function isValidCpf(value) {
    const cpf = onlyDigits(value);
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

    let sum = 0;
    for (let index = 0; index < 9; index += 1) {
      sum += Number(cpf[index]) * (10 - index);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== Number(cpf[9])) return false;

    sum = 0;
    for (let index = 0; index < 10; index += 1) {
      sum += Number(cpf[index]) * (11 - index);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    return digit === Number(cpf[10]);
  }

  function updateProgress() {
    const percent = Math.round(((state.step + 1) / totalSteps) * 100);
    progressLabel.textContent = state.step === totalSteps - 1 ? "Registro final" : `Etapa ${state.step + 1} de ${totalSteps}`;
    progressPercent.textContent = `${percent}%`;
    progressBar.style.width = `${percent}%`;
  }

  function transitionTo(renderCallback) {
    stepCard.classList.add("is-leaving");
    window.setTimeout(function () {
      renderCallback();
      stepCard.classList.remove("is-leaving");
      stepCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 180);
  }

  function fieldIsValid(field) {
    const value = state[field.id];

    if (field.id === "responsavelNome" || field.id === "menorNome") {
      return String(value || "").trim().split(/\s+/).length >= 2;
    }

    if (field.id === "responsavelCpf" || field.id === "menorCpf") {
      return isValidCpf(value);
    }

    if (field.id === "telefone") {
      return onlyDigits(value).length >= 10;
    }

    if (field.id === "menorNascimento") {
      return Boolean(value);
    }

    return Boolean(String(value || "").trim());
  }

  function stepIsValid(stepConfig) {
    const basicValid = stepConfig.fields.every(fieldIsValid);
    if (!basicValid) return false;
    if (stepConfig.fields.some(function (field) { return field.id === "menorCpf"; })) {
      return onlyDigits(state.responsavelCpf) !== onlyDigits(state.menorCpf);
    }
    return true;
  }

  function createField(field, next) {
    const wrapper = document.createElement("label");
    const label = document.createElement("span");
    let input;

    wrapper.className = "field";
    label.textContent = field.label;

    if (field.type === "select") {
      input = document.createElement("select");
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = field.placeholder || "Selecione";
      input.appendChild(empty);
      field.options.forEach(function (optionText) {
        const option = document.createElement("option");
        option.value = optionText;
        option.textContent = optionText;
        input.appendChild(option);
      });
    } else {
      input = document.createElement("input");
      input.type = field.type;
      input.placeholder = field.placeholder || "";
      input.autocomplete = field.autocomplete || "off";
      input.inputMode = field.inputMode || "text";
      if (field.maxLength) input.maxLength = field.maxLength;
    }

    input.id = field.id;
    input.value = state[field.id] || "";

    function validate() {
      if (field.id === "responsavelCpf" || field.id === "menorCpf") {
        input.value = maskCpf(input.value);
        state[field.id] = input.value;
      } else if (field.id === "telefone") {
        input.value = maskPhone(input.value);
        state[field.id] = input.value;
      } else if (field.type === "text") {
        input.value = input.value.toUpperCase();
        state[field.id] = input.value.trim();
      } else {
        state[field.id] = input.value;
      }

      next.disabled = !stepIsValid(fieldSteps[state.step]);
    }

    input.addEventListener("input", validate);
    input.addEventListener("change", validate);

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    return { wrapper, validate };
  }

  function renderFieldStep(index) {
    const config = fieldSteps[index];
    const node = fieldTemplate.content.cloneNode(true);
    const number = node.querySelector(".step-number");
    const title = node.querySelector("h2");
    const statement = node.querySelector(".statement");
    const grid = node.querySelector(".field-grid");
    const previous = node.querySelector("#prevButton");
    const next = node.querySelector("#nextButton");
    const validators = [];

    number.textContent = `Etapa ${state.step + 1}`;
    title.textContent = config.title;
    previous.style.visibility = state.step === 0 ? "hidden" : "visible";
    statement.innerHTML = "";
    const text = document.createElement("p");
    text.textContent = config.description;
    statement.appendChild(text);

    config.fields.forEach(function (field) {
      const fieldNode = createField(field, next);
      validators.push(fieldNode.validate);
      grid.appendChild(fieldNode.wrapper);
    });

    next.addEventListener("click", function () {
      state.step += 1;
      transitionTo(renderCurrentStep);
    });
    previous.addEventListener("click", function () {
      state.step -= 1;
      transitionTo(renderCurrentStep);
    });

    stepCard.innerHTML = "";
    stepCard.appendChild(node);
    validators.forEach(function (validate) { validate(); });
    updateProgress();
  }

  function validateTerm() {
    const confirm = document.querySelector("#termConfirm");
    const finish = document.querySelector("#finishButton");
    if (!confirm || !finish || !state.signaturePad) return;
    finish.disabled = !confirm.checked || !state.signaturePad.hasInk();
  }

  function showMessage(message) {
    const formMessage = document.querySelector("#formMessage");
    if (formMessage) formMessage.textContent = message;
  }

  function renderTerm() {
    const node = termTemplate.content.cloneNode(true);
    const number = node.querySelector(".step-number");

    number.textContent = `Etapa ${state.step + 1}`;
    stepCard.innerHTML = "";
    stepCard.appendChild(node);
    updateProgress();

    if (!state.signatureDate) state.signatureDate = todayText();

    const canvas = document.querySelector("#signatureCanvas");
    const confirm = document.querySelector("#termConfirm");
    const finish = document.querySelector("#finishButton");
    const previous = document.querySelector("#prevButton");
    const dateView = document.querySelector("#signatureDateView");

    dateView.textContent = state.signatureDate;
    state.signaturePad = window.DuoSignature.createSignaturePad(canvas);

    confirm.addEventListener("change", validateTerm);
    canvas.addEventListener("pointerup", validateTerm);
    canvas.addEventListener("pointerleave", validateTerm);

    document.querySelector("#clearSignature").addEventListener("click", function () {
      state.signaturePad.clear();
      validateTerm();
    });

    previous.addEventListener("click", function () {
      state.step -= 1;
      transitionTo(renderCurrentStep);
    });

    finish.addEventListener("click", handleSubmit);
    validateTerm();
  }

  function renderCompletion(result) {
    stepCard.innerHTML = "";
    progressLabel.textContent = "Registro final";
    progressPercent.textContent = "100%";
    progressBar.style.width = "100%";

    const panel = document.createElement("div");
    panel.className = "success-panel";

    const icon = document.createElement("div");
    icon.className = "success-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "✓";

    const title = document.createElement("h2");
    title.textContent = result.uploaded ? "ENVIO CONFIRMADO!" : "PDF gerado!";

    const actions = document.createElement("div");
    actions.className = "actions final-actions";
    const restart = document.createElement("button");
    restart.className = "button primary";
    restart.type = "button";
    restart.textContent = "Nova confirmação";
    restart.addEventListener("click", resetFlow);

    actions.appendChild(restart);
    panel.appendChild(icon);
    panel.appendChild(title);
    stepCard.appendChild(panel);
    stepCard.appendChild(actions);
    stepCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetFlow() {
    state.step = 0;
    state.responsavelNome = "";
    state.responsavelCpf = "";
    state.logradouro = "";
    state.numero = "";
    state.bairro = "";
    state.cidade = "GARANHUNS";
    state.uf = "PE";
    state.telefone = "";
    state.menorNome = "";
    state.menorCpf = "";
    state.menorNascimento = "";
    state.signaturePad = null;
    state.signatureDate = null;
    renderCurrentStep();
  }

  async function handleSubmit() {
    const finish = document.querySelector("#finishButton");
    if (!finish || finish.disabled) return;

    finish.disabled = true;
    finish.textContent = "GERANDO...";
    showMessage("");

    try {
      const result = await window.DuoMinorTermDocuments.generateDocument({
        responsavelNome: state.responsavelNome,
        responsavelCpf: state.responsavelCpf,
        logradouro: state.logradouro,
        numero: state.numero,
        bairro: state.bairro,
        cidade: state.cidade,
        uf: state.uf,
        telefone: state.telefone,
        menorNome: state.menorNome,
        menorCpf: state.menorCpf,
        menorNascimento: state.menorNascimento,
        date: state.signatureDate,
        time: timeText(),
        signatureImage: state.signaturePad.toDataURL()
      });
      renderCompletion(result);
    } catch (error) {
      finish.disabled = false;
      finish.textContent = "FINALIZAR";
      showMessage(error.message || "Não foi possível gerar o PDF. Tente novamente.");
    }
  }

  function renderCurrentStep() {
    if (state.step < fieldSteps.length) {
      renderFieldStep(state.step);
      return;
    }

    renderTerm();
  }

  renderCurrentStep();
})();
