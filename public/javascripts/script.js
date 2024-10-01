const md = markdownit();
const TEST_MODE = false;

const jobSearchForm = document.getElementById("job-search-form");
const predefinedJobTitleBtns = document.querySelectorAll(
  ".predefined-job-title"
);
const jobOverview = document.getElementById("job-overview");
const jobOverviewContent = jobOverview.querySelector(".content");
const personalizedSteps = document.getElementById("personalized-steps");
const personalizedStepsContent = personalizedSteps.querySelector(".content");
const jobOverviewProgressBar = document.getElementById(
  "job-overview-progress-bar"
);
const personalizedStepsProgressBar = document.getElementById(
  "personalized-steps-progress-bar"
);
const madeByFooter = document.getElementById("made-by");

const personalizeFormAccordion = document.getElementById(
  "personalize-form-accordion"
);
const personalizeForm = document.getElementById("personalize-form");

let selectedJobTitle = "";

const actionsWrapper = document.getElementById("actions-wrapper");

const openEmailSendDialogBtn = document.getElementById(
  "open-email-send-dialog-btn"
);
const emailSendDialog = document.getElementById("email-send-dialog");
const emailSendInput = document.getElementById("email-send-input");
const emailSendBtn = document.getElementById("email-send-btn");
const emailSendMsg = document.getElementById("email-send-msg");

const printBtn = document.getElementById("print-btn");

const jobOverviewMd = document.getElementById("job-overview-md");

openEmailSendDialogBtn.addEventListener("click", () => {
  toggleEmailSendDialog();
});

emailSendDialog.querySelector(`button#cancel`).addEventListener("click", () => {
  toggleEmailSendDialog();
});

document.addEventListener("keydown", (event) => {
  const isEmailSendDialogOpen = emailSendDialog.hasAttribute("open");
  if (event.key === "Escape" && isEmailSendDialogOpen) {
    toggleEmailSendDialog();
  }
});

emailSendBtn.addEventListener("click", () => {
  const email = emailSendInput.value;
  const overview = jobOverviewContent.innerHTML;
  const personalizedPath = personalizedStepsContent.innerHTML;
  const body = [overview, personalizedPath];

  if (!email.length) {
    emailSendMsg.textContent = "Email is required";
    emailSendMsg.style.color = "red";
    return;
  }

  postData(
    "/send-email",
    {
      jobTitle: selectedJobTitle,
      body,
      email,
    },
    "json"
  )
    .then((response) => {
      if (response.success) {
        emailSendMsg.textContent = "Email sent";
        emailSendMsg.style.color = "green";
        emailSendMsg.style.fontWeight = "bold";
        emailSendInput.value = "";
      } else {
        emailSendMsg.textContent = "Failed to send email";
        emailSendMsg.style.color = "red";
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      emailSendMsg.textContent = "Failed to send email";
      emailSendMsg.style.color = "red";
    })
    .finally(() => {
      setTimeout(() => {
        emailSendMsg.textContent = "";
      }, 5000);
    });
});

printBtn.addEventListener("click", () => {
  printContentAsPDF();
});

function toggleEmailSendDialog() {
  if (emailSendDialog.hasAttribute("open")) {
    emailSendDialog.removeAttribute("open");
  } else {
    emailSendDialog.setAttribute("open", 1);
  }
}

predefinedJobTitleBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    jobOverviewContent.innerText = "";
    jobOverview.setAttribute("hidden", 1);

    const jobTitle = btn.getAttribute("data-job-title");
    jobSearchForm.querySelector("input").value = jobTitle;
    handleInitialJobSearch(jobTitle);
  });
});

jobSearchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const jobTitle = formData.get("jobTitle");
  handleInitialJobSearch(jobTitle);
});

personalizeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  personalizedSteps.setAttribute("hidden", 1);
  handlePersonalizeFormSubmit();
});

async function handleInitialJobSearch(jobTitle) {
  toggleElementVisibility(jobOverviewProgressBar);
  const url = TEST_MODE ? "/test-chat" : "/job-overview";
  postData(url, {
    jobTitle,
  })
    .then((response) => {
      jobOverviewMd.value = response;
      const html = md.render(response);
      toggleElementVisibility(jobOverviewProgressBar);
      toggleElementVisibility(madeByFooter);

      jobOverviewContent.innerHTML = html;
      jobOverview.removeAttribute("hidden");
      selectedJobTitle = toTitleCase(jobTitle);

      toggleElementVisibility(actionsWrapper);
    })
    .catch((error) => {
      console.error("Error:", error);
    })
    .finally(toggleElementVisibility(madeByFooter));
}

function handlePersonalizeFormSubmit(params) {
  const formData = new FormData(personalizeForm);
  const formDataObj = {};
  for (const [key, value] of formData.entries()) {
    formDataObj[key] = value;
  }

  toggleElementVisibility(personalizedStepsProgressBar);
  const url = TEST_MODE ? "/test-chat-2" : "/personalized-path";
  postData(url, {
    jobTitle: selectedJobTitle,
    ...formDataObj,
  })
    .then((response) => {
      const html = md.render(response);
      toggleElementVisibility(personalizedStepsProgressBar);
      toggleElementVisibility(madeByFooter);

      personalizedStepsContent.innerHTML =
        `<h1>Your Personalized Career Path</h1>` + html;
      personalizedSteps.removeAttribute("hidden");

      personalizeFormAccordion.removeAttribute("open");
    })
    .catch((error) => {
      console.error("Error:", error);
    })
    .finally(toggleElementVisibility(madeByFooter));
}

async function postData(url, data, responseType = "text") {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    let textOrJsonResponse;

    if (responseType === "text") {
      textOrJsonResponse = await response.text();
    } else if (responseType === "json") {
      textOrJsonResponse = await response.json();
    }

    return textOrJsonResponse;
  } catch (error) {
    console.error("Error posting data:", error);
    throw error;
  }
}

function toggleElementVisibility(el) {
  if (el.hasAttribute("hidden")) {
    el.removeAttribute("hidden");
  } else {
    el.setAttribute("hidden", 1);
  }
}

function printContentAsPDF() {
  const content =
    jobOverviewContent.innerHTML + personalizedStepsContent.innerHTML;
  const printWindow = window.open("", "", "height=600,width=800");

  printWindow.document.write(`<html><head><title>${selectedJobTitle}</title>`);
  printWindow.document.write("</head><body>");
  printWindow.document.write(content);
  printWindow.document.write("</body></html>");

  printWindow.document.close();
  printWindow.focus();

  // to ensure the content is loaded before printing
  setTimeout(function () {
    printWindow.print();
    printWindow.close();
  }, 250);
}

function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
