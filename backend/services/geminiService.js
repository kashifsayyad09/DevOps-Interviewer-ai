const axios = require('axios');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const LEVEL_PROMPTS = {
  fresher: `fresher DevOps engineer with 0-1 year experience. Topics: CI/CD definition, version control basics (Git), what is Docker, what is a pipeline, Linux commands, what is DevOps culture, agile basics, what is YAML, basic networking (HTTP/DNS), what is a server.`,
  mid: `mid-level DevOps engineer with 2-4 years experience. Topics: Docker networking/volumes/compose, Kubernetes pods/services/deployments/ConfigMaps, Jenkins declarative pipelines, Terraform state/modules/providers, Ansible roles/playbooks, Git branching strategies (GitFlow), Prometheus metrics, Grafana dashboards, nginx reverse proxy, environment variables best practices.`,
  senior: `senior DevOps/SRE engineer with 5+ years experience. Topics: Kubernetes operators/CRDs/RBAC/admission controllers, chaos engineering principles, eBPF for observability, GitOps with ArgoCD/Flux, multi-cloud architecture, SLOs/SLIs/error budgets, platform engineering, distributed tracing (Jaeger/Zipkin), Istio service mesh, FinOps/cloud cost optimization, zero-downtime deployments, database reliability patterns.`
};

const generateQuestion = async (level, questionNumber, previousTopics = []) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const topicList = previousTopics.join(', ') || 'none';

  const prompt = `You are a strict but fair DevOps interviewer conducting a technical interview.

Generate a multiple-choice question for a ${LEVEL_PROMPTS[level]}

Question number: ${questionNumber} of 7
Previously covered topics: ${topicList} — pick a COMPLETELY DIFFERENT topic.

Requirements:
- Exactly 3 options: A, B, C
- Option A: The correct answer
- Option B: A common plausible misconception (sounds right but is wrong)
- Option C: A clearly incorrect answer
- Shuffle the correct answer randomly (don't always put it as A)

Respond ONLY in this exact JSON format with no markdown, no backticks, no extra text:
{"topic":"short topic label (2-4 words)","question":"The interview question?","options":{"A":"Option A text","B":"Option B text","C":"Option C text"},"correct":"B","explanation":"One sentence: why the correct answer is right.","wrong_note":"One sentence: why the other options are wrong."}`;

  const response = await axios.post(
    `${BASE_URL}?key=${apiKey}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 600 }
    },
    { timeout: 15000 }
  );

  const raw = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const clean = raw.replace(/```json|```/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  return JSON.parse(clean.slice(start, end + 1));
};

module.exports = { generateQuestion };
