var express = require("express");
var router = express.Router();
const brevo = require("@getbrevo/brevo");
const OpenAI = require("openai");
const fs = require("node:fs");

let assistantResponse = { role: "assistant", content: "" };

const openai = new OpenAI({
  organization: process.env.openai_organization_id,
  apiKey: process.env.openai_api_key,
});

let apiInstance = new brevo.TransactionalEmailsApi();
let apiKey = apiInstance.authentications["apiKey"];
apiKey.apiKey = process.env.brevo_api_key;

/* GET home page. */
router.get("/", function (req, res, next) {
  // sendEmail();
  res.render("index", { title: "CareerC" });
});

router.post("/job-overview", async function (req, res, next) {
  const { jobTitle } = req.body;
  const chat = await createChatCompletion("Data Scientist");
  console.log({ jobTitle });
  if (!chat) {
    res.send("nothing found");
  }

  res.send(chat);
});

router.post("/personalized-path", async function (req, res, next) {
  const jobOverviewMd = req.body.jobOverviewMd;
  const formData = req.body;
  delete formData.jobOverviewMd;
  const chat = await createChatCompletion(
    "Data Scientist",
    jobOverviewMd,
    formData
  );
  if (!chat) {
    res.send("nothing found");
  }

  res.send(chat);
});

router.get("/fetch", function (req, res, next) {
  console.log("fetch endpoint called");
  res.json({ message: "good things ahead" });
});

router.post("/test-chat", function (req, res, next) {
  const { jobTitle } = req.body;
  console.log({ jobTitle });
  fs.readFile("overview.md", "utf8", (err, data) => {
    if (err) {
      console.error(err);
      res.send("big bad");
      return;
    }

    res.send(data);
  });
});

function sendEmail(jobTitle = "", htmlContent = "") {
  let sendSmtpEmail = new brevo.SendSmtpEmail();

  sendSmtpEmail.subject = `Your Personalized Career Path - ${jobTitle}`;
  sendSmtpEmail.htmlContent =
    "<html><body><h1>Common: This is my second transactional email {{params.parameter}}</h1></body></html>";
  sendSmtpEmail.sender = { name: "CareerC", email: "careerc@logarithm.ca" };
  sendSmtpEmail.to = [{ email: "yemifakorede@gmail.com", name: "Yemi F" }];
  // sendSmtpEmail.replyTo = { email: "example@brevo.com", name: "sample-name" };
  // sendSmtpEmail.headers = { "Some-Custom-Name": "unique-id-1234" };
  sendSmtpEmail.params = {
    parameter: "My param value",
    subject: "common subject",
  };

  apiInstance.sendTransacEmail(sendSmtpEmail).then(
    function (data) {
      console.log("API called successfully");
    },
    function (error) {
      console.error(error);
    }
  );
}

async function createChatCompletion(
  jobTitle,
  overviewMd = null,
  formData = null
) {
  const initialPrompt = generateJobOverviewPrompt(jobTitle);
  const messages = [
    { role: "system", content: "You are a helpful assistant." },
    initialPrompt,
  ];

  if (overviewMd) {
    messages.push({ role: "assistant", content: overviewMd });
  }

  if (formData) {
    const prompt = generatePersonalizedFollowUpPrompt(formData);
    messages.push(prompt);
  }

  const completion = await openai.chat.completions.create({
    messages,
    model: "gpt-4o-mini-2024-07-18",
  });

  const response = completion.choices[0] || null;
  if (!response) {
    return null;
  }
  messages.push(response.message);
  console.log(messages);

  const md = response.message.content;

  return md;
}

function generateJobOverviewPrompt(jobTitle) {
  if (!jobTitle.length) {
    return null;
  }

  const prompt = `I want to be a ${jobTitle}. Show me the job overview of a ${jobTitle}. Include job description, responsibilities, skills needed, typical qualifications, salary range, future outlook.`;
  return { role: "user", content: prompt };
}

function generatePersonalizedFollowUpPrompt(formData) {
  formData = removeEmptyValues(formData);
  const { currentEducation, currentJob, careerChange, timeline } = formData;
  const builder = {
    currentEducation: `My current education level is ${currentEducation}.`,
    currentJob: `My current job is ${currentJob}.`,
    careerChange: `This is a career change.`,
    timeline: `My timeline is ${timeline} years.`,
  };

  if (careerChange !== "on") {
    delete formData.careerChange;
  }

  let str =
    "Given the following information, show me a personalized career path. ";

  for (const key in formData) {
    console.log(key);
    str += `${builder[key]} `;
  }

  return { role: "user", content: str };
}

function removeEmptyValues(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([key, value]) => value !== null && value !== undefined && value !== ""
    )
  );
}

module.exports = router;
