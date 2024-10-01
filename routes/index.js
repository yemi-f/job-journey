var express = require("express");
var router = express.Router();
const brevo = require("@getbrevo/brevo");
const OpenAI = require("openai");
const fs = require("node:fs");

const openai = new OpenAI({
  organization: process.env.OPENAI_ORGANIZATION_ID,
  apiKey: process.env.OPENAI_API_KEY,
});

let apiInstance = new brevo.TransactionalEmailsApi();
let apiKey = apiInstance.authentications["apiKey"];
apiKey.apiKey = process.env.BREVO_API_KEY;

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", { title: "JobJourney" });
});

router.post("/job-overview", async function (req, res, next) {
  const { jobTitle } = req.body;
  const chat = await createChatCompletion(jobTitle);
  console.log({ jobTitle });
  if (!chat) {
    res.send("nothing found");
  }

  res.send(chat);
});

router.post("/send-email", async function (req, res, next) {
  const { body, jobTitle, email } = req.body;
  if (!body.length || !jobTitle.length) {
    return res.json({ success: false });
  }

  const html = body.join("");
  const success = await sendEmail(email, jobTitle, html);

  return res.json({ success });
});

router.post("/personalized-path", async function (req, res, next) {
  const jobOverviewMd = req.body.jobOverviewMd;
  const jobTitle = req.body.jobTitle;
  const formData = req.body;

  delete formData.jobOverviewMd;
  delete formData.jobTitle;

  const chat = await createChatCompletion(jobTitle, jobOverviewMd, formData);
  if (!chat) {
    res.send("nothing found");
  }

  res.send(chat);
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

router.post("/test-chat-2", function (req, res, next) {
  const { jobTitle } = req.body;
  console.log({ jobTitle });
  fs.readFile("personalized.md", "utf8", (err, data) => {
    if (err) {
      console.error(err);
      res.send("big bad");
      return;
    }

    res.send(data);
  });
});

async function sendEmail(to, jobTitle = "", html = "") {
  let sendSmtpEmail = new brevo.SendSmtpEmail();

  sendSmtpEmail.subject = `Your Personalized Career Path - ${jobTitle}`;
  sendSmtpEmail.htmlContent = `<html><body>${html}</body></html>`;
  sendSmtpEmail.sender = {
    name: "JobJourney",
    email: "job.journey@logarithm.ca",
  };
  sendSmtpEmail.to = [{ email: to }];
  return apiInstance.sendTransacEmail(sendSmtpEmail).then(
    function (data) {
      console.log("API called successfully", data.response.statusCode);
      return data.response.statusCode === 201;
    },
    function (error) {
      console.error(error);
      return false;
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
  const {
    educationLevel,
    careerChange,
    currentJob,
    timeCommitment,
    learningStyle,
    timeline,
  } = formData;
  const builder = {
    educationLevel: `My current education level is ${educationLevel}.`,
    careerChange: `This is a career change.`,
    currentJob: `My current job is ${currentJob}.`,
    timeCommitment: `My time commitment is ${timeCommitment}.`,
    learningStyle: `My learning style is ${learningStyle}.`,
    timeline: `My timeline is ${timeline} years.`,
  };

  if (careerChange !== "yes") {
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
