import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import DiscProfileDashboard from './components/DiscProfileDashboard'
import ProgressBadge from './components/ProgressBadge'
import ShareableResultsCard from './components/ShareableResultsCard'
import SocialShareButtons from './components/SocialShareButtons'
import ExecutiveReportDocument from './components/exports/ExecutiveReportDocument'
import { useExportReport } from './hooks/useExportReport'
import { submitDiscScore } from './lib/discApi'
import { buildOgImageUrl, buildShareText, buildShareUrl, trackShareEvent, getSignatureLeadershipStyle } from './lib/share'
import { appBrand, exportCopy, milestoneCopy, nextStepGuidance, onboardingCopy } from './lib/content'
import { traitMeta } from './lib/discProfile'
import type { DiscScoreResponse, TraitKey } from './types/disc'

const questions = [
  // --- BLOCO 1: RITMO & TOMADA DE DECISÃO (1-10) ---
  {
    prompt: '1. When building momentum on a new project, I tend to...',
    options: [
      { label: 'Move quickly and decisively to hit ambitious targets', trait: 'D' },
      { label: 'Bring warmth, vision, and high energy to the team', trait: 'I' },
      { label: 'Create steady calm, harmony, and consistency', trait: 'S' },
      { label: 'Refine details, set standards, and ensure accuracy', trait: 'C' },
    ],
  },
  {
    prompt: '2. In a group setting, I feel most useful when I...',
    options: [
      { label: 'Set clear direction and take charge of decisions', trait: 'D' },
      { label: 'Connect people, inspire ideas, and spark conversation', trait: 'I' },
      { label: 'Support team members patiently and listen deeply', trait: 'S' },
      { label: 'Organize complex information and provide logical structure', trait: 'C' },
    ],
  },
  {
    prompt: '3. When making important decisions, I place the highest value on...',
    options: [
      { label: 'Speed, autonomy, and direct impact on the bottom line', trait: 'D' },
      { label: 'Buy-in, enthusiasm, and how it affects morale', trait: 'I' },
      { label: 'Consensus, stability, and minimizing disruption', trait: 'S' },
      { label: 'Data, logic, risk assessment, and thorough facts', trait: 'C' },
    ],
  },
  {
    prompt: '4. My natural speed of execution is usually...',
    options: [
      { label: 'Urgent and fast-paced; I dislike waiting around', trait: 'D' },
      { label: 'Spontaneous and energetic, driven by momentum', trait: 'I' },
      { label: 'Paced and deliberate; I prefer a steady flow', trait: 'S' },
      { label: 'Methodical and careful; quality takes priority over speed', trait: 'C' },
    ],
  },
  {
    prompt: '5. When given a complex problem with vague guidelines, I instinctively...',
    options: [
      { label: 'Take ownership immediately and forge my own solution path', trait: 'D' },
      { label: 'Brainstorm out loud with others to find creative angles', trait: 'I' },
      { label: 'Seek alignment with the team before taking step one', trait: 'S' },
      { label: 'Gather all available facts to build a systematic plan', trait: 'C' },
    ],
  },
  {
    prompt: '6. When delegating tasks to others, my priority is ensuring...',
    options: [
      { label: 'They focus entirely on hitting the desired outcome quickly', trait: 'D' },
      { label: 'They feel empowered, excited, and inspired to do it', trait: 'I' },
      { label: 'They have the exact support and time they need to succeed', trait: 'S' },
      { label: 'They have precise instructions, rules, and quality standards', trait: 'C' },
    ],
  },
  {
    prompt: '7. My reaction to strict rules and procedures is typically...',
    options: [
      { label: 'To bypass them if they slow down progress or results', trait: 'D' },
      { label: 'To treat them as flexible guidelines rather than rigid limits', trait: 'I' },
      { label: 'To respect them because they provide safety and structure', trait: 'S' },
      { label: 'To follow and enforce them strictly to prevent mistakes', trait: 'C' },
    ],
  },
  {
    prompt: '8. In a high-stakes meeting, you will most likely see me...',
    options: [
      { label: 'Challenging assumptions and driving straight to action points', trait: 'D' },
      { label: 'Pitching bold ideas and keeping energy levels high', trait: 'I' },
      { label: 'Listening attentiveness and encouraging quieter voices', trait: 'S' },
      { label: 'Taking detailed notes, asking probing questions, and verifying claims', trait: 'C' },
    ],
  },
  {
    prompt: '9. How do you feel about taking calculated risks?',
    options: [
      { label: 'I embrace them boldly if the potential reward is high', trait: 'D' },
      { label: 'I jump in enthusiastically if it feels exciting and fresh', trait: 'I' },
      { label: 'I prefer safe, proven routes with minimal uncertainty', trait: 'S' },
      { label: 'I analyze all probabilities deeply before taking a single step', trait: 'C' },
    ],
  },
  {
    prompt: '10. When starting my work day, I prefer to focus first on...',
    options: [
      { label: 'The highest-impact task that moves the needle right away', trait: 'D' },
      { label: 'Checking in with people and connecting with the team', trait: 'I' },
      { label: 'Continuing routine tasks in a steady, predictable order', trait: 'S' },
      { label: 'Reviewing my schedule, organized lists, and priority details', trait: 'C' },
    ],
  },

  // --- BLOCO 2: COMUNICAÇÃO & RELAÇÕES (11-20) ---
  {
    prompt: '11. In daily communication, my natural style is...',
    options: [
      { label: 'Direct, brief, and focused purely on outcomes', trait: 'D' },
      { label: 'Animated, expressive, and story-driven', trait: 'I' },
      { label: 'Warm, patient, and focused on active listening', trait: 'S' },
      { label: 'Precise, objective, and backed by evidence', trait: 'C' },
    ],
  },
  {
    prompt: '12. When building working relationships, I place the most trust in people who are...',
    options: [
      { label: 'Competent, decisive, and accountable for results', trait: 'D' },
      { label: 'Open-minded, engaging, and positive-minded', trait: 'I' },
      { label: 'Loyal, consistent, and genuinely supportive', trait: 'S' },
      { label: 'Thorough, honest, and rigorous in their standards', trait: 'C' },
    ],
  },
  {
    prompt: '13. My approach to networking and meeting new colleagues is...',
    options: [
      { label: 'Strategic; I look for connections that drive key objectives', trait: 'D' },
      { label: 'Effortless; I love engaging people and sharing energy', trait: 'I' },
      { label: 'Quietly observant; I prefer deep 1-on-1 connections over time', trait: 'S' },
      { label: 'Reserved; I engage when there is a clear, meaningful reason', trait: 'C' },
    ],
  },
  {
    prompt: '14. When giving feedback to someone, I tend to be...',
    options: [
      { label: 'Blunt, frank, and focused on fixing issues instantly', trait: 'D' },
      { label: 'Encouraging, optimistic, and focused on potential', trait: 'I' },
      { label: 'Gentle, tactful, and careful not to hurt feelings', trait: 'S' },
      { label: 'Specific, objective, and focused on facts and errors', trait: 'C' },
    ],
  },
  {
    prompt: '15. People who know me well would describe my social presence as...',
    options: [
      { label: 'Assertive, strong-willed, and commanding', trait: 'D' },
      { label: 'Charismatic, persuasive, and outgoing', trait: 'I' },
      { label: 'Kind, reliable, and approachable', trait: 'S' },
      { label: 'Discreet, analytical, and thoughtful', trait: 'C' },
    ],
  },
  {
    prompt: '16. In conversations, I tend to get frustrated most by...',
    options: [
      { label: 'Indecisiveness, hesitation, and endless debate', trait: 'D' },
      { label: 'Pessimism, overly rigid rules, and dull detail-checking', trait: 'I' },
      { label: 'Aggressive tone, confrontation, and sudden changes', trait: 'S' },
      { label: 'Vague statements, emotional arguments, and lack of proof', trait: 'C' },
    ],
  },
  {
    prompt: '17. When persuading others to adopt my view, I rely heavily on...',
    options: [
      { label: 'Confident assertion and pointing out the clear advantages', trait: 'D' },
      { label: 'Enthusiasm, storytelling, and painting a compelling vision', trait: 'I' },
      { label: 'Showing how it benefits the group and keeps peace', trait: 'S' },
      { label: 'Presenting structured logic, data, and well-researched facts', trait: 'C' },
    ],
  },
  {
    prompt: '18. When working in cross-functional teams, my role often becomes...',
    options: [
      { label: 'The driver pushing everyone across the finish line', trait: 'D' },
      { label: 'The spark connecting ideas and keeping spirits high', trait: 'I' },
      { label: 'The anchor keeping everyone grounded and collaborating', trait: 'S' },
      { label: 'The reviewer ensuring quality control and exact precision', trait: 'C' },
    ],
  },
  {
    prompt: '19. How do you handle emotional expressions from teammates?',
    options: [
      { label: 'I redirect focus back to the facts and required actions', trait: 'D' },
      { label: 'I empathize quickly and try to brighten the mood', trait: 'I' },
      { label: 'I offer a quiet, patient ear and a supportive presence', trait: 'S' },
      { label: 'I analyze the situation logically to help solve the root issue', trait: 'C' },
    ],
  },
  {
    prompt: '20. When receiving praise, I feel most appreciated when acknowledged for my...',
    options: [
      { label: 'Ability to conquer tough obstacles and deliver big wins', trait: 'D' },
      { label: 'Creativity, enthusiasm, and influence on the team', trait: 'I' },
      { label: 'Dependability, patience, and silent dedication', trait: 'S' },
      { label: 'Subject matter mastery, accuracy, and high quality', trait: 'C' },
    ],
  },

  // --- BLOCO 3: PRESSÃO, CONFLITO & MUDANÇA (21-30) ---
  {
    prompt: '21. When faced with an unexpected crisis or obstacle, my instinct is to...',
    options: [
      { label: 'Take immediate control and push through with force', trait: 'D' },
      { label: 'Rally people, stay positive, and improvise creative workarounds', trait: 'I' },
      { label: 'Stay calm, hold the fort, and support others through the shift', trait: 'S' },
      { label: 'Step back, assess risks logically, and formulate a clear plan', trait: 'C' },
    ],
  },
  {
    prompt: '22. Under intense pressure or tight deadlines, I am most prone to become...',
    options: [
      { label: 'Demanding, impatient, or overly controlling', trait: 'D' },
      { label: 'Overly talkative, disorganized, or scattered', trait: 'I' },
      { label: 'Overly accommodating, quiet, or resistant to conflict', trait: 'S' },
      { label: 'Overly critical, perfectionistic, or withdrawn', trait: 'C' },
    ],
  },
  {
    prompt: '23. When dealing with workplace disagreement or conflict, I tend to...',
    options: [
      { label: 'Confront it directly to clear the air and resolve it fast', trait: 'D' },
      { label: 'Use charm, humor, or diplomacy to smooth things over', trait: 'I' },
      { label: 'Yield or compromise to preserve team harmony and calm', trait: 'S' },
      { label: 'Rely on objective facts, policy, and logic to prove the point', trait: 'C' },
    ],
  },
  {
    prompt: '24. When organizational changes disrupt my usual routine, I...',
    options: [
      { label: 'Adapt quickly if I see how it gives me more advantage/control', trait: 'D' },
      { label: 'Embrace it eagerly as a fresh and exciting opportunity', trait: 'I' },
      { label: 'Feel uneasy initially and need time to adjust safely', trait: 'S' },
      { label: 'Evaluate it critically to check if the new system is truly logical', trait: 'C' },
    ],
  },
  {
    prompt: '25. When someone directly challenges my opinion in public, I...',
    options: [
      { label: 'Defend my position firmly and stand my ground', trait: 'D' },
      { label: 'Reframe the topic with quick wit to keep the audience engaged', trait: 'I' },
      { label: 'Listen quietly to avoid escalating the tension further', trait: 'S' },
      { label: 'Provide evidence, data, and structured points to refute them', trait: 'C' },
    ],
  },
  {
    prompt: '26. My biggest internal fear in a professional setting is...',
    options: [
      { label: 'Being taken advantage of or losing control of outcomes', trait: 'D' },
      { label: 'Being rejected, ignored, or losing social standing', trait: 'I' },
      { label: 'Sudden instability, chaos, or hurting team harmony', trait: 'S' },
      { label: 'Making a flawed mistake or being proven wrong/unprepared', trait: 'C' },
    ],
  },
  {
    prompt: '27. When a plan I designed fails unexpectedly, I...',
    options: [
      { label: 'Pivot instantly to plan B without dwelling on the past', trait: 'D' },
      { label: 'Reframing it as a valuable lesson and keeping spirits up', trait: 'I' },
      { label: 'Seek comfort in team solidarity and work steadily to fix it', trait: 'S' },
      { label: 'Conduct a deep post-mortem to diagnose exactly what broke', trait: 'C' },
    ],
  },
  {
    prompt: '28. In situations where I feel overwhelmed with tasks, I tend to...',
    options: [
      { label: 'Push harder, eliminate distractions, and force my way through', trait: 'D' },
      { label: 'Look for collaborators or talk it through to release stress', trait: 'I' },
      { label: 'Systematically work through one item at a time with patience', trait: 'S' },
      { label: 'Re-organize priorities, build a checklist, and double-check order', trait: 'C' },
    ],
  },
  {
    prompt: '29. When dealing with difficult or demanding clients, my strategy is to...',
    options: [
      { label: 'Show strong authority, set boundaries, and drive quick results', trait: 'D' },
      { label: 'Build rapport, diffuse tension with positivity, and charm them', trait: 'I' },
      { label: 'Display calm patience, reassure them, and provide consistent care', trait: 'S' },
      { label: 'Deliver immaculate documentation, facts, and precise answers', trait: 'C' },
    ],
  },
  {
    prompt: '30. How do you handle feedback that points out a flaw in your work?',
    options: [
      { label: 'I accept it if it speeds up my results, but prefer autonomy', trait: 'D' },
      { label: 'I prefer it delivered gently and framed around my potential', trait: 'I' },
      { label: 'I appreciate it delivered privately with genuine support', trait: 'S' },
      { label: 'I scrutinize it against facts to verify if it is accurate', trait: 'C' },
    ],
  },

  // --- BLOCO 4: MOTIVAÇÃO & FOCO (31-40) ---
  {
    prompt: '31. What drives your internal motivation the most?',
    options: [
      { label: 'Achieving measurable victories and overcoming obstacles', trait: 'D' },
      { label: 'Recognition, social impact, and creative freedom', trait: 'I' },
      { label: 'Security, genuine relationships, and peace of mind', trait: 'S' },
      { label: 'Mastery, accuracy, and producing flawless standards', trait: 'C' },
    ],
  },
  {
    prompt: '32. If I had to choose a core superpower for my career, it would be...',
    options: [
      { label: 'Unstoppable drive and courage in high-stakes situations', trait: 'D' },
      { label: 'Magnetic persuasion and inspiring energy', trait: 'I' },
      { label: 'Unshakable loyalty, patience, and dependability', trait: 'S' },
      { label: 'Unmatched analytical depth and high-precision execution', trait: 'C' },
    ],
  },
  {
    prompt: '33. When reviewing my own work, my primary filter is...',
    options: [
      { label: '"Did this achieve the end objective quickly and efficiently?"', trait: 'D' },
      { label: '"Is this engaging, inspiring, and well-received?"', trait: 'I' },
      { label: '"Is this helpful, sustainable, and fair to everyone?"', trait: 'S' },
      { label: '"Is this accurate, compliant, and thoroughly checked?"', trait: 'C' },
    ],
  },
  {
    prompt: '34. I feel most energized at the end of a workday when I have...',
    options: [
      { label: 'Crushed a difficult challenge or hit a major milestone', trait: 'D' },
      { label: 'Connected meaningfully with inspiring people and generated ideas', trait: 'I' },
      { label: 'Helped someone out and enjoyed a smooth, productive rhythm', trait: 'S' },
      { label: 'Solved a complex puzzle or perfected a technical system', trait: 'C' },
    ],
  },
  {
    prompt: '35. When managing projects, my natural tendency is to focus on...',
    options: [
      { label: 'Setting hard deadlines, driving accountability, and winning', trait: 'D' },
      { label: 'Keeping enthusiasm high, brainstorming, and selling the dream', trait: 'I' },
      { label: 'Maintaining team cohesion, steady pacing, and clear support', trait: 'S' },
      { label: 'Establishing standards, risk registers, and detailed specs', trait: 'C' },
    ],
  },
  {
    prompt: '36. In terms of professional development, I am most eager to learn...',
    options: [
      { label: 'Leadership tactics, executive strategy, and negotiation', trait: 'D' },
      { label: 'Public speaking, storytelling, and brand influence', trait: 'I' },
      { label: 'Team dynamics, coaching, and conflict resolution', trait: 'S' },
      { label: 'Specialized technical expertise, domain knowledge, and methods', trait: 'C' },
    ],
  },
  {
    prompt: '37. How do you view routine, repetitive work?',
    options: [
      { label: 'I delegate or automate it quickly; I prefer new challenges', trait: 'D' },
      { label: 'I find it boring and prefer dynamic, variety-filled work', trait: 'I' },
      { label: 'I find comfort and stability in predictable daily routines', trait: 'S' },
      { label: 'I enjoy it if it allows me to optimize processes and systems', trait: 'C' },
    ],
  },
  {
    prompt: '38. When set against a ambitious goal, my mind immediately jumps to...',
    options: [
      { label: 'How fast we can execute and what stands in our way', trait: 'D' },
      { label: 'Who we can enlist to make this an exciting journey', trait: 'I' },
      { label: 'How we can organize the workload fairly for everyone involved', trait: 'S' },
      { label: 'What the exact steps, metrics, and risks are', trait: 'C' },
    ],
  },
  {
    prompt: '39. When evaluating a new business opportunity, I prioritize...',
    options: [
      { label: 'High ROI, competitive advantage, and fast scaling', trait: 'D' },
      { label: 'Innovation, brand excitement, and market appeal', trait: 'I' },
      { label: 'Long-term stability, ethical alignment, and safety', trait: 'S' },
      { label: 'Clear logic, verified financial data, and risk mitigation', trait: 'C' },
    ],
  },
  {
    prompt: '40. My relationship with perfectionism is best described as...',
    options: [
      { label: 'Done is better than perfect; momentum matters most', trait: 'D' },
      { label: 'Perfection is secondary to excitement and impact', trait: 'I' },
      { label: 'Perfection is less important than team harmony and steady work', trait: 'S' },
      { label: 'Excellence requires high standards; details make or break quality', trait: 'C' },
    ],
  },

  // --- BLOCO 5: AMBIENTE IDEAL & ESTILO MENTAL (41-50) ---
  {
    prompt: '41. The ideal work environment for me is one that offers...',
    options: [
      { label: 'High autonomy, authority, and freedom to take initiative', trait: 'D' },
      { label: 'Social connection, creative freedom, and vibrant energy', trait: 'I' },
      { label: 'Predictability, supportive teamwork, and minimal drama', trait: 'S' },
      { label: 'Structure, clarity of expectations, and quiet focus time', trait: 'C' },
    ],
  },
  {
    prompt: '42. When reading or learning new information, I tend to prefer...',
    options: [
      { label: 'Executive summaries, bullet points, and key takeaways', trait: 'D' },
      { label: 'Engaging visuals, audio, stories, and real-life examples', trait: 'I' },
      { label: 'Step-by-step guides and practical, hands-on tutorials', trait: 'S' },
      { label: 'Comprehensive documentation, technical specs, and whitepapers', trait: 'C' },
    ],
  },
  {
    prompt: '43. My approach to managing time and daily schedules is...',
    options: [
      { label: 'Results-based; I adapt my schedule on the fly to win', trait: 'D' },
      { label: 'Fluid and flexible; I dislike overly rigid schedules', trait: 'I' },
      { label: 'Consistent and steady; I stick to reliable daily habits', trait: 'S' },
      { label: 'Structured and scheduled; I use calendars and precise lists', trait: 'C' },
    ],
  },
  {
    prompt: '44. What kind of manager or leader brings out the best in you?',
    options: [
      { label: 'One who sets bold targets and gives me complete freedom to execute', trait: 'D' },
      { label: 'One who is inspiring, supportive, and gives public recognition', trait: 'I' },
      { label: 'One who is patient, consistent, and provides steady guidance', trait: 'S' },
      { label: 'One who is logical, clear, organized, and respects standards', trait: 'C' },
    ],
  },
  {
    prompt: '45. When contributing to team meetings, I prefer to speak...',
    options: [
      { label: 'Early and firmly, setting the direction', trait: 'D' },
      { label: 'Often and enthusiastically, keeping momentum high', trait: 'I' },
      { label: 'When asked, or to offer steady, supportive thoughts', trait: 'S' },
      { label: 'When I have verified facts and well-thought-out points to share', trait: 'C' },
    ],
  },
  {
    prompt: '46. How do you view rules and compliance in everyday operations?',
    options: [
      { label: 'Useful until they hinder efficiency or growth', trait: 'D' },
      { label: 'A secondary thought compared to innovation and relationships', trait: 'I' },
      { label: 'Essential for maintaining safety, fairness, and calm order', trait: 'S' },
      { label: 'Critical backbone; without them, quality declines', trait: 'C' },
    ],
  },
  {
    prompt: '47. In a fast-moving brainstorming session, my focus is on...',
    options: [
      { label: 'Filtering for the single fastest idea that drives results', trait: 'D' },
      { label: 'Generating as many creative, wild ideas as possible', trait: 'I' },
      { label: 'Ensuring everyone has a voice and feels comfortable', trait: 'S' },
      { label: 'Analyzing the feasibility and technical logic behind ideas', trait: 'C' },
    ],
  },
  {
    prompt: '48. When working under a leader who micro-manages, I feel...',
    options: [
      { label: 'Restricted and frustrated; I demand space to perform', trait: 'D' },
      { label: 'Suffocated and unmotivated; I lose my creative spark', trait: 'I' },
      { label: 'Uncomfortable with tension, but I will quietly adapt', trait: 'S' },
      { label: 'Fine if their guidelines are logical, precise, and fair', trait: 'C' },
    ],
  },
  {
    prompt: '49. When completing a long-term project, my greatest strength is...',
    options: [
      { label: 'Maintaining relentless pressure until cross the finish line', trait: 'D' },
      { label: 'Keeping team engagement and optimism strong throughout', trait: 'I' },
      { label: 'Providing consistent, day-in-day-out effort without quitting', trait: 'S' },
      { label: 'Ensuring zero flaws, meticulous quality, and precise delivery', trait: 'C' },
    ],
  },
  {
    prompt: '50. Ultimately, my definition of professional success is...',
    options: [
      { label: 'Achieving power, influence, and high-impact accomplishments', trait: 'D' },
      { label: 'Making a memorable impact, inspiring others, and enjoying freedom', trait: 'I' },
      { label: 'Building a stable, meaningful life with strong community trust', trait: 'S' },
      { label: 'Becoming a true expert who delivers uncompromised excellence', trait: 'C' },
    ],
  },
]

const STORAGE_KEY = 'disc-wellness-progress'

type PersistedProgress = {
  step: number
  answers: string[]
  selected: string | null
  showResults: boolean
  started: boolean
  profile: DiscScoreResponse['profile'] | null
  apiError: string | null
  isScoring: boolean
}

const readPersistedProgress = (): PersistedProgress | null => {
  if (typeof window === 'undefined') {
    return null
  }

  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (!saved) {
    return null
  }

  try {
    const parsed = JSON.parse(saved) as Partial<PersistedProgress>
    return {
      step: typeof parsed.step === 'number' ? parsed.step : 0,
      answers: Array.isArray(parsed.answers) ? parsed.answers.filter((answer): answer is string => typeof answer === 'string') : [],
      selected: typeof parsed.selected === 'string' ? parsed.selected : null,
      showResults: Boolean(parsed.showResults),
      started: Boolean(parsed.started),
      profile: parsed.profile ?? null,
      apiError: typeof parsed.apiError === 'string' ? parsed.apiError : null,
      isScoring: Boolean(parsed.isScoring),
    }
  } catch {
    return null
  }
}

const milestoneMessages = [
  {
    threshold: 25,
    badge: 'Quarter way',
    message: 'You are building momentum—your reflections are getting clearer.',
  },
  {
    threshold: 50,
    badge: 'Halfway there',
    message: 'Halfway there! Calibrating your leadership style...',
  },
  {
    threshold: 75,
    badge: 'Nearly there',
    message: 'You are in the home stretch—one thoughtful answer at a time.',
  },
] as const

function App() {
  const persistedProgress = readPersistedProgress()
  const [step, setStep] = useState(persistedProgress?.step ?? 0)
  const [answers, setAnswers] = useState<string[]>(persistedProgress?.answers ?? [])
  const [selected, setSelected] = useState<string | null>(persistedProgress?.selected ?? null)
  const [showResults, setShowResults] = useState(persistedProgress?.showResults ?? false)
  const [started, setStarted] = useState(persistedProgress?.started ?? false)
  const [copied, setCopied] = useState(false)
  const [profile, setProfile] = useState<DiscScoreResponse['profile'] | null>(persistedProgress?.profile ?? null)
  const [apiError, setApiError] = useState<string | null>(persistedProgress?.apiError ?? null)
  const [isScoring, setIsScoring] = useState(persistedProgress?.isScoring ?? false)
  const shareCardRef = useRef<HTMLDivElement | null>(null)
  const reportExportRef = useRef<HTMLDivElement | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const { isExporting, exportError: exportReportError, exportReport, generatedAt } = useExportReport({
    profile,
    primaryTrait: (profile?.primaryTrait ?? 'D') as TraitKey,
    secondaryTrait: (profile?.secondaryTrait ?? 'C') as TraitKey,
    completionScore: Math.min(100, Math.round((answers.length / questions.length) * 100)),
    fileName: 'northstar-disc-report',
  })

  const currentQuestion = questions[step]

  const primaryTrait = profile?.primaryTrait ?? 'D'

  const handleSelect = async (trait: string) => {
    setSelected(trait)
    const nextAnswers = [...answers, trait]
    setAnswers(nextAnswers)

    if (step < questions.length - 1) {
      setTimeout(() => {
        setStep(step + 1)
        setSelected(null)
      }, 220)
      return
    }

    setIsScoring(true)
    setApiError(null)

    try {
      const result = await submitDiscScore({ answers: nextAnswers.map((answer) => ({ trait: answer as 'D' | 'I' | 'S' | 'C' })) })
      if (result.success) {
        setProfile(result.profile)
        setShowResults(true)
      } else {
        setApiError(result.error)
        setShowResults(false)
      }
    } catch (error) {
      const fallbackResult = await submitDiscScore({ answers: nextAnswers.map((answer) => ({ trait: answer as 'D' | 'I' | 'S' | 'C' })) })
      if (fallbackResult.success) {
        setProfile(fallbackResult.profile)
        setShowResults(true)
      } else {
        setApiError(error instanceof Error ? error.message : 'Unable to score your results right now.')
        setShowResults(false)
      }
    } finally {
      setIsScoring(false)
    }
  }

  const progress = ((step + (selected ? 1 : 0)) / questions.length) * 100
  const completionPercent = Math.min(100, Math.round(progress))
  const activeMilestone = [...milestoneMessages].reverse().find((item) => completionPercent >= item.threshold) ?? null

  useEffect(() => {
    if (!showResults) {
      return
    }

    setCelebrate(true)
    const timeout = window.setTimeout(() => setCelebrate(false), 2200)
    return () => window.clearTimeout(timeout)
  }, [showResults])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const hasProgress = started || answers.length > 0 || showResults || profile !== null || apiError !== null || step > 0 || selected !== null || isScoring

    if (!hasProgress) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        step,
        answers,
        selected,
        showResults,
        started,
        profile,
        apiError,
        isScoring,
      }))
    } catch {
      // Ignore storage access errors and preserve the in-memory experience.
    }
  }, [answers, apiError, isScoring, profile, selected, showResults, started, step])

  const startReflection = () => {
    setStarted(true)
  }

  const goToIntro = () => {
    setStep(0)
    setAnswers([])
    setSelected(null)
    setShowResults(false)
    setStarted(false)
    setProfile(null)
    setApiError(null)

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'DISC reflection', text: shareText })
        trackShareEvent({ platform: 'linkedin', referralCode, profileSignature: profile ? 'Northstar DISC' : undefined })
        return
      } catch {
        // fall back to clipboard copy
      }
    }

    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      trackShareEvent({ platform: 'linkedin', referralCode, profileSignature: profile ? 'Northstar DISC' : undefined })
      window.setTimeout(() => setCopied(false), 2200)
      return
    } catch {
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${encodeURIComponent(shareText)}`,
        '_blank',
        'noopener,noreferrer',
      )
      trackShareEvent({ platform: 'linkedin', referralCode, profileSignature: profile ? 'Northstar DISC' : undefined })
    }
  }

  const handleDownloadCard = async (format: 'png' | 'pdf' = 'png') => {
    if (!reportExportRef.current) {
      return
    }

    const result = await exportReport(format, reportExportRef.current)
    if (result.ok) {
      trackShareEvent({ platform: format === 'pdf' ? 'linkedin' : 'twitter', referralCode, profileSignature: profile ? 'Northstar DISC' : undefined })
    }
  }

  const resultsHeading = profile ? `You feel most aligned with ${traitMeta[primaryTrait as keyof typeof traitMeta].label}` : 'Your gentle profile'
  const completionScore = Math.min(100, Math.round((answers.length / questions.length) * 100))
  const streakLabel = answers.length >= questions.length ? 'Completed' : `${answers.length}/${questions.length} prompts`
  const shareStatusText = copied ? 'Saved to clipboard' : 'Works beautifully for LinkedIn-style sharing and quick offline export.'
  const referralCode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ref') ?? undefined : undefined
  const shareUrl = buildShareUrl('linkedin', typeof window !== 'undefined' ? window.location.href : 'https://disc-wellness.app', referralCode)
  const shareText = buildShareText({
    primaryTrait: (profile?.primaryTrait ?? 'D') as 'D' | 'I' | 'S' | 'C',
    secondaryTrait: (profile?.secondaryTrait ?? 'C') as 'D' | 'I' | 'S' | 'C',
    url: shareUrl,
    referralCode,
  })
  const confettiPieces = Array.from({ length: 10 }, (_, index) => ({
    id: index,
    left: `${8 + index * 8}%`,
    delay: index * 0.04,
    color: ['#c78e69', '#8b5e3c', '#d8b08b', '#7c6c5f'][index % 4],
  }))

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const signature = profile ? getSignatureLeadershipStyle(profile.primaryTrait, profile.secondaryTrait).badge : 'Northstar DISC'
    const ogImageUrl = buildOgImageUrl(signature, referralCode)

    document.title = `${signature} • Northstar DISC`

    const descriptionMeta = document.querySelector('meta[name="description"]')
    if (descriptionMeta) {
      descriptionMeta.setAttribute('content', `${signature}. Discover your behavioral style with Northstar DISC.`)
    }

    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) {
      ogTitle.setAttribute('content', `${signature} • Northstar DISC`)
    }

    const ogDescription = document.querySelector('meta[property="og:description"]')
    if (ogDescription) {
      ogDescription.setAttribute('content', `${signature}. Discover your behavioral style with Northstar DISC.`)
    }

    const ogImage = document.querySelector('meta[property="og:image"]')
    if (ogImage) {
      ogImage.setAttribute('content', ogImageUrl)
    }

    const twitterImage = document.querySelector('meta[name="twitter:image"]')
    if (twitterImage) {
      twitterImage.setAttribute('content', ogImageUrl)
    }
  }, [profile, referralCode])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8efe9,_#fcfaf7_60%,_#f4ebe3)] text-stone-700">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <header className="mb-4 flex items-center justify-between rounded-full border border-stone-200/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-[linear-gradient(135deg,_#f5ede4,_#e9d9c9)] text-sm font-semibold tracking-[0.25em] text-stone-700">
              ND
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-stone-500">{appBrand.name}</p>
              <h1 className="text-lg font-semibold text-stone-800">{appBrand.tagline}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm text-stone-600">
              50 Questions • ~5 min
            </div>
            <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm text-stone-600">
              {showResults ? 'Results' : started ? `Step ${Math.min(step + 1, questions.length)} of ${questions.length}` : 'Launch'}
            </div>
          </div>
        </header>

        <AnimatePresence mode="sync">
          {!started && !showResults ? (
            <motion.section
              key="launch"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-1 flex-col justify-center"
            >
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.01 : 0.24 }}
                className="mb-5 rounded-[2rem] border border-stone-200/80 bg-white/80 p-6 shadow-[0_20px_60px_-25px_rgba(84,56,45,0.35)] backdrop-blur sm:p-8"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-stone-300 bg-[linear-gradient(135deg,_#f8efe8,_#e8d6c4)] text-sm font-semibold tracking-[0.25em] text-stone-700">
                    ND
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-stone-500">{appBrand.name}</p>
                    <h2 className="text-3xl font-semibold leading-tight text-stone-800 sm:text-4xl">{appBrand.tagline}</h2>
                  </div>
                </div>
                <p className="mt-4 max-w-2xl text-base leading-8 text-stone-600">{appBrand.description}</p>
                <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                  <p className="font-medium text-stone-800">Why leaders use it</p>
                  <p className="mt-2">A practical, elegant reflection that helps you understand your communication style with clarity.</p>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <motion.button
                    type="button"
                    onClick={startReflection}
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    className="rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
                  >
                    Start your reflection
                  </motion.button>

                </div>
              </motion.div>
            </motion.section>
          ) : started && !showResults ? (
            <motion.section
              key="quiz"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-1 flex-col justify-center"
            >
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                animate={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.01 : 0.24 }}
                className="mb-5 rounded-[2rem] border border-stone-200/80 bg-white/80 p-4 shadow-[0_20px_60px_-25px_rgba(84,56,45,0.35)] backdrop-blur sm:p-6"
              >
                <div className="mb-4 rounded-full border border-stone-200/80 bg-[linear-gradient(180deg,_#fcfaf7,_#f4ebdf)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <div className="relative h-3 overflow-hidden rounded-full bg-stone-200/80">
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,_#c78e69,_#9b6b4e,_#7c4f33)]"
                      animate={{ width: `${Math.max(4, progress)}%` }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <motion.div
                      className="absolute inset-y-0 left-0 rounded-full bg-white/40"
                      animate={{ width: `${Math.max(4, progress)}%` }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </div>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <ProgressBadge label="Flow" value={`${completionPercent}%`} />
                    <ProgressBadge label="Streak" value={streakLabel} />
                  </div>
                  {activeMilestone ? (
                    <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 shadow-sm">
                      <span className="font-semibold">{activeMilestone.badge}</span> • {activeMilestone.message}
                    </div>
                  ) : null}
                </div>
                <p className="mb-2 text-sm text-stone-500">{onboardingCopy.intro}</p>
                <h2 className="mb-2 text-2xl font-semibold leading-tight text-stone-800 sm:text-3xl">
                  {onboardingCopy.subtitle}
                </h2>
                <p className="mb-4 text-sm leading-7 text-stone-600">{onboardingCopy.note}</p>
                <div className="mb-5 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                  <p className="font-medium text-stone-800">Current prompt</p>
                  <p className="mt-1">{currentQuestion.prompt}</p>
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion.prompt}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    className="grid gap-3"
                  >
                    {currentQuestion.options.map((option) => (
                      <motion.button
                        key={option.label}
                        type="button"
                        onClick={() => handleSelect(option.trait)}
                        whileHover={{ y: -2, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        className={`rounded-2xl border px-4 py-4 text-left text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 ${
                          selected === option.trait
                            ? 'border-stone-600 bg-stone-900 text-white shadow-lg'
                            : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300 hover:bg-white'
                        }`}
                      >
                        {option.label}
                      </motion.button>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </motion.section>
          ) : (
            <motion.section
              key="results"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex flex-1 flex-col gap-5 py-2"
            >
              <AnimatePresence>
                {celebrate ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[2rem]"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.25 }}
                      className="absolute inset-x-0 top-8 mx-auto w-[min(88%,_18rem)] rounded-full border border-stone-200/80 bg-white/85 px-4 py-2 text-center text-sm font-semibold text-stone-700 shadow-[0_10px_30px_-12px_rgba(84,56,45,0.45)] backdrop-blur"
                    >
                      Reflection complete ✨
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: [0, 1, 0], y: [0, 24, 42] }}
                      transition={{ duration: 1.6, ease: 'easeOut' }}
                      className="absolute inset-x-0 top-20 mx-auto w-fit rounded-full border border-stone-200/70 bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-stone-600 shadow-sm"
                    >
                      Your insights are ready
                    </motion.div>
                    {confettiPieces.map((piece) => (
                      <motion.span
                        key={piece.id}
                        initial={{ opacity: 0, y: -8, x: 0, scale: 0.8 }}
                        animate={{ opacity: [0, 1, 0], y: [0, 140], x: [0, piece.id % 2 === 0 ? 58 : -58], scale: [0.8, 1, 0.8] }}
                        transition={{ duration: 1.6, ease: 'easeOut', delay: piece.delay }}
                        className="absolute top-16 h-3 w-3 rounded-full"
                        style={{ left: piece.left, backgroundColor: piece.color }}
                      />
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.01 : 0.28, ease: 'easeOut' }}
                className="rounded-[2rem] border border-stone-200/80 bg-white/80 p-5 shadow-[0_20px_60px_-25px_rgba(84,56,45,0.35)] backdrop-blur sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Your gentle profile</p>
                    <h2 className="mt-2 text-3xl font-semibold text-stone-800">{resultsHeading}</h2>
                    <p className="mt-3 text-base leading-7 text-stone-600">{profile ? profile.narrative : 'We are preparing your profile now.'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ProgressBadge label="Completion" value={`${completionScore}%`} />
                    <ProgressBadge label="Focus" value={profile ? traitMeta[primaryTrait as keyof typeof traitMeta].label : 'Processing…'} />
                  </div>
                </div>
              </motion.div>

              <div className="space-y-4">
                <div className="rounded-[2rem] border border-stone-200/80 bg-white/85 p-4 shadow-[0_20px_60px_-25px_rgba(84,56,45,0.35)] backdrop-blur sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Share your profile</p>
                      <h3 className="mt-2 text-xl font-semibold text-stone-800">Make your reflection easy to pass along.</h3>
                    </div>
                    <div className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-sm font-medium text-stone-700">
                      Signature badge ready
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <SocialShareButtons shareText={shareText} />
                  </div>
                </div>

                <DiscProfileDashboard
                  profile={profile}
                  completionScore={completionScore}
                  primaryTrait={primaryTrait as 'D' | 'I' | 'S' | 'C'}
                  secondaryTrait={(profile?.secondaryTrait ?? 'C') as 'D' | 'I' | 'S' | 'C'}
                />

                <div ref={shareCardRef}>
                  <ShareableResultsCard
                    profile={profile}
                    primaryTrait={(profile?.primaryTrait ?? 'D') as 'D' | 'I' | 'S' | 'C'}
                    secondaryTrait={(profile?.secondaryTrait ?? 'C') as 'D' | 'I' | 'S' | 'C'}
                  />
                </div>

                <div ref={reportExportRef} className="fixed left-[-9999px] top-0 z-[-1] w-[900px] bg-transparent" aria-hidden="true">
                  <ExecutiveReportDocument
                    profile={profile}
                    primaryTrait={(profile?.primaryTrait ?? 'D') as TraitKey}
                    secondaryTrait={(profile?.secondaryTrait ?? 'C') as TraitKey}
                    completionScore={completionScore}
                    generatedAt={generatedAt}
                  />
                </div>
              </div>

              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.01 : 0.28, ease: 'easeOut', delay: prefersReducedMotion ? 0 : 0.06 }}
                className="rounded-[2rem] border border-stone-200/80 bg-[linear-gradient(135deg,_#f9f3ec,_#f3e4d8)] p-5 shadow-[0_20px_60px_-25px_rgba(84,56,45,0.35)] sm:p-6"
              >
                <div className="mb-4 rounded-2xl border border-stone-200/80 bg-white/70 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{milestoneCopy.title}</p>
                  <p className="mt-2 text-sm font-medium text-stone-800">{milestoneCopy.body}</p>
                </div>
                <div className="rounded-[1.5rem] border border-stone-200 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-[linear-gradient(135deg,_#f7eee5,_#e4d0bc)] text-sm font-semibold tracking-[0.25em] text-stone-700">
                        ND
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{exportCopy.title}</p>
                        <p className="text-sm font-semibold text-stone-800">{appBrand.name} results card</p>
                      </div>
                    </div>
                    <div className="rounded-full bg-stone-900 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-white">
                      Ready to export
                    </div>
                  </div>
                  <div className="mt-4 rounded-[1.25rem] border border-stone-200 bg-[linear-gradient(135deg,_#f9f2eb,_#f1e5d8)] p-4">
                    <p className="text-sm leading-7 text-stone-700">{exportCopy.body}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-sm font-medium text-stone-700">
                        Primary style · {traitMeta[primaryTrait as keyof typeof traitMeta].label}
                      </span>
                      <span className="rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-sm font-medium text-stone-700">
                        Share-ready
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Share it with your network</p>
                    <p className="mt-2 text-lg font-semibold text-stone-800">A polished reflection you can post in one tap.</p>
                    <p className="mt-2 text-sm leading-7 text-stone-600">{profile ? 'A calm, thoughtful reflection for your energy profile.' : 'This will be ready as soon as the anonymous scoring completes.'}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <ProgressBadge label="Share" value="Ready" />
                      <ProgressBadge label="Brand" value={appBrand.name} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <div className="flex flex-wrap gap-2">
                      <motion.button
                        type="button"
                        onClick={handleShare}
                        whileHover={{ y: -2, scale: 1.01 }}
                        whileTap={{ scale: 0.97 }}
                        animate={copied ? { scale: [1, 1.03, 1], boxShadow: '0 0 0 6px rgba(199, 142, 105, 0.18)' } : { scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
                      >
                        {copied ? 'Copied summary' : 'Copy summary'}
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => handleDownloadCard('pdf')}
                        whileHover={{ y: -2, scale: 1.01 }}
                        whileTap={{ scale: 0.97 }}
                        disabled={isExporting}
                        className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isExporting ? 'Preparing export…' : 'Download PDF'}
                      </motion.button>
                    </div>
                    <motion.p
                      className="text-xs text-stone-500"
                      animate={copied ? { opacity: 1, y: 0 } : { opacity: 0.9, y: 0 }}
                      transition={{ duration: 0.2 }}
                      aria-live="polite"
                    >
                      {exportReportError ? exportReportError : shareStatusText}
                    </motion.p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.01 : 0.28, ease: 'easeOut', delay: prefersReducedMotion ? 0 : 0.08 }}
                className="rounded-[2rem] border border-stone-200/80 bg-white/80 p-5 shadow-[0_20px_60px_-25px_rgba(84,56,45,0.35)] sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-stone-500">{nextStepGuidance.title}</p>
                    <h3 className="mt-2 text-xl font-semibold text-stone-800">A small next step can make this reflection more useful.</h3>
                    <p className="mt-2 text-sm leading-7 text-stone-600">{nextStepGuidance.intro}</p>
                    <ul className="mt-4 space-y-2 text-sm text-stone-700">
                      {nextStepGuidance.actions.map((action) => (
                        <li key={action} className="flex items-start gap-2">
                          <span className="mt-1 h-2 w-2 rounded-full bg-stone-400" />
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>


              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.01 : 0.28, ease: 'easeOut', delay: prefersReducedMotion ? 0 : 0.08 }}
                className="rounded-[2rem] border border-stone-200/80 bg-gradient-to-br from-white via-[#f8f3ec] to-[#f3e7da] p-6 shadow-[0_28px_80px_-36px_rgba(84,56,45,0.36)] sm:p-7"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.3em] text-stone-500">Support this work</p>
                    <h3 className="mt-2 text-2xl font-semibold text-stone-900">Keep this premium experience moving forward.</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">
                      A small contribution helps me keep building thoughtful tools, refined exports, and better leadership experiences. Your support directly powers future features, better polish, and a stronger LinkedIn-ready presentation.
                    </p>
                    <p className="mt-4 text-sm leading-7 text-stone-700">
                      Follow <strong>João Costa | LinkedIn</strong> for updates and early access to new improvements: <a href="https://www.linkedin.com/in/joaocosta1695/" target="_blank" rel="noreferrer" className="font-semibold text-stone-900 underline">linkedin.com/in/joaocosta1695</a>.
                    </p>
                    <p className="mt-3 text-sm text-stone-500">Payment support options will be available soon — thank you for helping this project grow.</p>
                  </div>
                  <a
                    href="https://www.buymeacoffee.com"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-stone-200/60 transition hover:bg-stone-800"
                  >
                    Buy me a coffee
                  </a>
                </div>
              </motion.div>

              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: prefersReducedMotion ? 0.01 : 0.28, ease: 'easeOut', delay: prefersReducedMotion ? 0 : 0.1 }}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <motion.button
                  type="button"
                  onClick={goToIntro}
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                  className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
                >
                  Back to intro
                </motion.button>
                {apiError ? <p className="text-sm text-stone-500">{apiError}</p> : null}
                {isScoring ? <p className="text-sm text-stone-500">Scoring your response…</p> : null}
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default App
