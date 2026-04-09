import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import AceEditor from "react-ace";
import Footer from "./components/footer/Footer";
import {
  csDefault,
  pyDefault,
  javaDefault,
  jsDefault,
  golangDefault,
  rustDefault,
} from "./components/code/defaults";
import "./App.css";
import "ace-builds/src-min-noconflict/ext-language_tools";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:6500";
const TOKEN_KEY = "codeRunnerToken";
const USER_KEY = "codeRunnerUser";
const languages = ["python", "javascript", "java", "csharp", "golang", "rust"];
const themes = ["dracula", "monokai"];
const starterDefaults = {
  python: pyDefault,
  javascript: jsDefault,
  java: javaDefault,
  csharp: csDefault,
  golang: golangDefault,
  rust: rustDefault,
};

themes.forEach((theme) =>
  require(`ace-builds/src-min-noconflict/theme-${theme}`)
);
languages.forEach((lang) => {
  require(`ace-builds/src-min-noconflict/mode-${lang}`);
  require(`ace-builds/src-min-noconflict/snippets/${lang}`);
});
require("ace-builds/src-min-noconflict/mode-text");

const buildHeaders = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

const getStarter = (challenge, language) =>
  challenge?.starterCode?.[language] || starterDefaults[language];

const parseJsonArray = (value) => {
  const parsed = value.trim() ? JSON.parse(value) : [];
  if (!Array.isArray(parsed)) {
    throw new Error("Expected a JSON array.");
  }
  return parsed;
};

function App() {
  const [theme, setTheme] = useState("dracula");
  const [authMode, setAuthMode] = useState("login");
  const [authRole, setAuthRole] = useState("student");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);

  const [challenges, setChallenges] = useState([]);
  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [studentMessage, setStudentMessage] = useState("");
  const [studentBusy, setStudentBusy] = useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = useState("");
  const [studentForm, setStudentForm] = useState({
    language: "python",
    code: pyDefault,
    output: "",
    verdict: "",
  });

  const [adminSubmissions, setAdminSubmissions] = useState([]);
  const [adminChallenges, setAdminChallenges] = useState([]);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminMessage, setAdminMessage] = useState("");
  const [selectedAdminSubmissionId, setSelectedAdminSubmissionId] = useState("");
  const [reviewForm, setReviewForm] = useState({
    adminReviewStatus: "reviewed",
    adminFeedback: "",
  });
  const [challengeForm, setChallengeForm] = useState({
    title: "",
    slug: "",
    difficulty: "easy",
    problemStatement: "",
    inputSpecification: "",
    outputSpecification: "",
    constraintsText: "",
    timeLimitMs: "2000",
    memoryLimitMb: "256",
    publicTestCases:
      '[{"input":"1 2 3\\n","expectedOutput":"6\\n","explanation":"Sample"}]',
    hiddenTestCases:
      '[{"input":"10 20 30\\n","expectedOutput":"60\\n"}]',
  });

  const selectedChallenge = useMemo(
    () => challenges.find((item) => item._id === selectedChallengeId) || null,
    [challenges, selectedChallengeId]
  );
  const selectedAdminSubmission = useMemo(
    () =>
      adminSubmissions.find((item) => item._id === selectedAdminSubmissionId) ||
      null,
    [adminSubmissions, selectedAdminSubmissionId]
  );

  const clearSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken("");
    setUser(null);
  };

  const persistSession = (nextToken, nextUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const loadChallenges = async (activeToken = token) => {
    const response = await axios.get(
      `${API_BASE}/challenges`,
      buildHeaders(activeToken)
    );
    const nextChallenges = response.data.challenges || [];
    setChallenges(nextChallenges);
    if (nextChallenges.length > 0) {
      setSelectedChallengeId((current) =>
        current && nextChallenges.some((item) => item._id === current)
          ? current
          : nextChallenges[0]._id
      );
    }
  };

  const loadStudentSubmissions = async (activeToken = token) => {
    const response = await axios.get(
      `${API_BASE}/submissions/mine`,
      buildHeaders(activeToken)
    );
    setStudentSubmissions(response.data.submissions || []);
  };

  const loadAdminSubmissions = async (activeToken = token) => {
    const response = await axios.get(
      `${API_BASE}/admin/submissions`,
      buildHeaders(activeToken)
    );
    const submissions = response.data.submissions || [];
    setAdminSubmissions(submissions);
    if (submissions.length > 0) {
      setSelectedAdminSubmissionId((current) =>
        current && submissions.some((item) => item._id === current)
          ? current
          : submissions[0]._id
      );
    }
  };

  const loadAdminChallenges = async (activeToken = token) => {
    const response = await axios.get(
      `${API_BASE}/admin/challenges`,
      buildHeaders(activeToken)
    );
    setAdminChallenges(response.data.challenges || []);
  };

  useEffect(() => {
    const bootstrap = async () => {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (!savedToken) {
        setBootLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `${API_BASE}/auth/me`,
          buildHeaders(savedToken)
        );
        setToken(savedToken);
        setUser(response.data.user);
      } catch (error) {
        clearSession();
      } finally {
        setBootLoading(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (!user || !token) {
      return;
    }

    const run = async () => {
      try {
        if (user.role === "student") {
          await Promise.all([loadChallenges(token), loadStudentSubmissions(token)]);
        } else {
          await Promise.all([loadAdminSubmissions(token), loadAdminChallenges(token)]);
        }
      } catch (error) {
        const message =
          error?.response?.data?.message || "Failed to load dashboard data.";
        if (user.role === "student") {
          setStudentMessage(message);
        } else {
          setAdminMessage(message);
        }
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  useEffect(() => {
    if (!selectedChallenge) {
      return;
    }

    setStudentForm((current) => ({
      ...current,
      code: getStarter(selectedChallenge, current.language),
      output: "",
      verdict: "",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChallengeId]);

  useEffect(() => {
    if (!selectedAdminSubmission) {
      return;
    }

    setReviewForm({
      adminReviewStatus:
        selectedAdminSubmission.adminReviewStatus || "reviewed",
      adminFeedback: selectedAdminSubmission.adminFeedback || "",
    });
  }, [selectedAdminSubmission]);

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((current) => ({ ...current, [name]: value }));
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");

    try {
      const endpoint =
        authMode === "register" ? "/auth/register" : "/auth/login";
      const response = await axios.post(`${API_BASE}${endpoint}`, {
        ...authForm,
        role: authRole,
      });
      persistSession(response.data.token, response.data.user);
      setAuthForm({ name: "", email: "", password: "" });
    } catch (error) {
      setAuthError(
        error?.response?.data?.message ||
          `Failed to ${authMode === "register" ? "register" : "log in"}.`
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    setChallenges([]);
    setStudentSubmissions([]);
    setAdminSubmissions([]);
    setAdminChallenges([]);
    setSelectedChallengeId("");
    setSelectedAdminSubmissionId("");
    setStudentForm({
      language: "python",
      code: pyDefault,
      output: "",
      verdict: "",
    });
  };

  const handleStudentLanguageChange = (language) => {
    setStudentForm((current) => ({
      ...current,
      language,
      code: getStarter(selectedChallenge, language),
    }));
  };

  const handleRunSamples = async () => {
    if (!selectedChallenge) {
      return;
    }

    setStudentBusy(true);
    setStudentMessage("");
    try {
      const response = await axios.post(
        `${API_BASE}/judge/run-public`,
        {
          challengeId: selectedChallenge._id,
          language: studentForm.language,
          code: studentForm.code,
        },
        buildHeaders(token)
      );

      const result = response.data.result;
      setStudentForm((current) => ({
        ...current,
        verdict: result.verdict,
        output:
          result.testResults
            .map(
              (item) =>
                `Case ${item.index} ${item.verdict}${
                  item.actualOutput ? `\n${item.actualOutput}` : ""
                }`
            )
            .join("\n\n") || result.summary,
      }));
      setStudentMessage("Public test cases evaluated.");
    } catch (error) {
      setStudentMessage(
        error?.response?.data?.message || "Failed to run public test cases."
      );
    } finally {
      setStudentBusy(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!selectedChallenge) {
      return;
    }

    setStudentBusy(true);
    setStudentMessage("");
    try {
      const response = await axios.post(
        `${API_BASE}/judge/submit`,
        {
          challengeId: selectedChallenge._id,
          language: studentForm.language,
          code: studentForm.code,
        },
        buildHeaders(token)
      );

      setStudentForm((current) => ({
        ...current,
        verdict: response.data.result.verdict,
        output: response.data.result.summary,
      }));
      await loadStudentSubmissions(token);
      setStudentMessage(`Submission judged: ${response.data.result.verdict}`);
    } catch (error) {
      setStudentMessage(
        error?.response?.data?.message || "Failed to submit solution."
      );
    } finally {
      setStudentBusy(false);
    }
  };

  const handleChallengeFormChange = (event) => {
    const { name, value } = event.target;
    setChallengeForm((current) => ({ ...current, [name]: value }));
  };

  const handleCreateChallenge = async (event) => {
    event.preventDefault();
    setAdminBusy(true);
    setAdminMessage("");

    try {
      await axios.post(
        `${API_BASE}/admin/challenges`,
        {
          ...challengeForm,
          timeLimitMs: Number(challengeForm.timeLimitMs),
          memoryLimitMb: Number(challengeForm.memoryLimitMb),
          publicTestCases: parseJsonArray(challengeForm.publicTestCases),
          hiddenTestCases: parseJsonArray(challengeForm.hiddenTestCases),
        },
        buildHeaders(token)
      );
      await loadAdminChallenges(token);
      setAdminMessage("Challenge created.");
    } catch (error) {
      setAdminMessage(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to create challenge."
      );
    } finally {
      setAdminBusy(false);
    }
  };

  const handleSaveReview = async () => {
    if (!selectedAdminSubmission) {
      return;
    }

    setAdminBusy(true);
    setAdminMessage("");
    try {
      await axios.patch(
        `${API_BASE}/admin/submissions/${selectedAdminSubmission._id}/review`,
        reviewForm,
        buildHeaders(token)
      );
      await loadAdminSubmissions(token);
      setAdminMessage("Review saved.");
    } catch (error) {
      setAdminMessage(
        error?.response?.data?.message || "Failed to save review."
      );
    } finally {
      setAdminBusy(false);
    }
  };

  if (bootLoading) {
    return (
      <div className="app-shell">
        <main className="loading-screen">Loading Code Runner...</main>
      </div>
    );
  }

  const renderAuth = () => (
    <main className="auth-layout">
      <section className="auth-panel">
        <div className="toggle-row">
          <button
            className={authRole === "student" ? "toggle active" : "toggle"}
            onClick={() => setAuthRole("student")}
          >
            Student Login
          </button>
          <button
            className={authRole === "admin" ? "toggle active" : "toggle"}
            onClick={() => setAuthRole("admin")}
          >
            Administrator Login
          </button>
        </div>
        <div className="mode-row">
          <button
            className={authMode === "login" ? "mode active" : "mode"}
            onClick={() => setAuthMode("login")}
          >
            Sign In
          </button>
          <button
            className={authMode === "register" ? "mode active" : "mode"}
            onClick={() => setAuthMode("register")}
          >
            Create Account
          </button>
        </div>
        <form className="auth-form" onSubmit={handleAuthSubmit}>
          {authMode === "register" ? (
            <label>
              Full name
              <input
                name="name"
                value={authForm.name}
                onChange={handleAuthChange}
              />
            </label>
          ) : null}
          <label>
            Email
            <input
              name="email"
              type="email"
              value={authForm.email}
              onChange={handleAuthChange}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              value={authForm.password}
              onChange={handleAuthChange}
            />
          </label>
          {authError ? <p className="status error">{authError}</p> : null}
          <button className="primary-button" disabled={authBusy}>
            {authBusy
              ? "Please wait..."
              : authMode === "register"
              ? `Create ${authRole} account`
              : `Enter as ${authRole}`}
          </button>
        </form>
      </section>
    </main>
  );

  const renderStudent = () => (
    <main className="workspace-grid">
      <aside className="sidebar-panel">
        <div className="panel-header">
          <div>
            <p className="panel-label">Challenges</p>
            <h2>Available problems</h2>
          </div>
        </div>
        <div className="submission-list">
          {challenges.map((challenge) => (
            <button
              key={challenge._id}
              className={
                selectedChallengeId === challenge._id
                  ? "submission-card active"
                  : "submission-card"
              }
              onClick={() => setSelectedChallengeId(challenge._id)}
            >
              <strong>{challenge.title}</strong>
              <span>{challenge.difficulty}</span>
              <span>{challenge.hiddenTestCaseCount} hidden tests</span>
            </button>
          ))}
        </div>
      </aside>
      <section className="editor-panel">
        {selectedChallenge ? (
          <>
            <div className="panel-header">
              <div>
                <p className="panel-label">Problem</p>
                <h2>{selectedChallenge.title}</h2>
                <p className="meta-line">
                  {selectedChallenge.difficulty} · {selectedChallenge.timeLimitMs} ms
                  · {selectedChallenge.memoryLimitMb} MB
                </p>
              </div>
            </div>
            <div className="problem-card">
              <p>{selectedChallenge.problemStatement}</p>
              <h3>Input</h3>
              <p>{selectedChallenge.inputSpecification}</p>
              <h3>Output</h3>
              <p>{selectedChallenge.outputSpecification}</p>
              <h3>Constraints</h3>
              <p>{selectedChallenge.constraintsText}</p>
              <h3>Examples</h3>
              <div className="testcase-grid">
                {selectedChallenge.publicTestCases.map((testCase, index) => (
                  <div className="testcase-card" key={`${selectedChallenge._id}-${index}`}>
                    <strong>Example {index + 1}</strong>
                    <pre>{testCase.input}</pre>
                    <pre>{testCase.expectedOutput}</pre>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="empty-state">No challenges available.</p>
        )}
      </section>
    </main>
  );

  const renderStudentWorkspace = () => (
    <>
      <div className="form-strip">
        <label className="field">
          Language
          <select
            value={studentForm.language}
            onChange={(event) => handleStudentLanguageChange(event.target.value)}
          >
            {languages.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Theme
          <select
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
          >
            {themes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="editor-grid">
        <div className="editor-card">
          <AceEditor
            mode={studentForm.language}
            theme={theme}
            name="student-editor"
            value={studentForm.code}
            onChange={(code) =>
              setStudentForm((current) => ({ ...current, code }))
            }
            width="100%"
            height="100%"
            fontSize={16}
            setOptions={{
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: true,
              showLineNumbers: true,
              tabSize: 4,
            }}
            editorProps={{ $blockScrolling: true }}
          />
        </div>
        <div className="editor-card output-card">
          <div className="output-meta">
            <span className={`status-badge ${studentForm.verdict ? "success" : "draft"}`}>
              {studentForm.verdict || "Ready"}
            </span>
          </div>
          <AceEditor
            mode="text"
            theme={theme}
            name="student-output"
            value={studentForm.output}
            readOnly
            width="100%"
            height="100%"
            fontSize={15}
            editorProps={{ $blockScrolling: true }}
          />
        </div>
      </div>
      <div className="action-row">
        <button
          className="secondary-button"
          onClick={handleRunSamples}
          disabled={studentBusy}
        >
          Run Public Tests
        </button>
        <button
          className="primary-button"
          onClick={handleSubmitSolution}
          disabled={studentBusy}
        >
          Submit Solution
        </button>
      </div>
      {studentMessage ? <p className="status">{studentMessage}</p> : null}
      <div className="panel-header submissions-header">
        <div>
          <p className="panel-label">My Judged Submissions</p>
          <h2>Recent results</h2>
        </div>
      </div>
      <div className="submission-list compact">
        {studentSubmissions.map((submission) => (
          <div className="submission-card static" key={submission._id}>
            <strong>{submission.challenge?.title || submission.title}</strong>
            <span>{submission.language}</span>
            <span>Verdict {submission.verdict || submission.executionStatus}</span>
            <span>
              Passed {submission.passedTestCases}/{submission.totalTestCases}
            </span>
          </div>
        ))}
      </div>
    </>
  );

  const renderAdmin = () => (
    <main className="workspace-grid admin-grid">
      <aside className="sidebar-panel">
        <div className="panel-header">
          <div>
            <p className="panel-label">Judged Submissions</p>
            <h2>Student results</h2>
          </div>
        </div>
        <div className="submission-list">
          {adminSubmissions.map((submission) => (
            <button
              key={submission._id}
              className={
                selectedAdminSubmissionId === submission._id
                  ? "submission-card active"
                  : "submission-card"
              }
              onClick={() => setSelectedAdminSubmissionId(submission._id)}
            >
              <strong>{submission.challenge?.title || submission.title}</strong>
              <span>{submission.user?.name}</span>
              <span>{submission.language}</span>
              <span>{submission.verdict || submission.executionStatus}</span>
            </button>
          ))}
        </div>
      </aside>
      <section className="editor-panel">
        {selectedAdminSubmission ? (
          <>
            <div className="panel-header">
              <div>
                <p className="panel-label">Submission Review</p>
                <h2>{selectedAdminSubmission.challenge?.title || selectedAdminSubmission.title}</h2>
                <p className="meta-line">
                  {selectedAdminSubmission.user?.name} · {selectedAdminSubmission.user?.email}
                </p>
              </div>
            </div>
            <div className="editor-grid">
              <div className="editor-card">
                <AceEditor
                  mode={selectedAdminSubmission.language}
                  theme={theme}
                  name="admin-code"
                  value={selectedAdminSubmission.code}
                  readOnly
                  width="100%"
                  height="100%"
                  fontSize={15}
                  editorProps={{ $blockScrolling: true }}
                />
              </div>
              <div className="editor-card output-card">
                <AceEditor
                  mode="text"
                  theme={theme}
                  name="admin-output"
                  value={selectedAdminSubmission.output || ""}
                  readOnly
                  width="100%"
                  height="100%"
                  fontSize={15}
                  editorProps={{ $blockScrolling: true }}
                />
              </div>
            </div>
          </>
        ) : (
          <p className="empty-state">No judged submissions yet.</p>
        )}
      </section>
    </main>
  );

  const renderAdminTools = () => (
    <>
      <div className="review-grid">
        <label className="field">
          Review status
          <select
            value={reviewForm.adminReviewStatus}
            onChange={(event) =>
              setReviewForm((current) => ({
                ...current,
                adminReviewStatus: event.target.value,
              }))
            }
          >
            <option value="reviewed">reviewed</option>
            <option value="needs_changes">needs changes</option>
          </select>
        </label>
        <label className="field field-wide">
          Feedback
          <textarea
            value={reviewForm.adminFeedback}
            onChange={(event) =>
              setReviewForm((current) => ({
                ...current,
                adminFeedback: event.target.value,
              }))
            }
            rows={5}
          />
        </label>
      </div>
      <div className="action-row">
        <button className="primary-button" onClick={handleSaveReview} disabled={adminBusy}>
          Save Review
        </button>
      </div>
      <div className="panel-header submissions-header">
        <div>
          <p className="panel-label">Create Challenge</p>
          <h2>Author a new judged problem</h2>
        </div>
      </div>
      <form className="challenge-form" onSubmit={handleCreateChallenge}>
        <div className="form-strip triple">
          <label className="field">
            Title
            <input name="title" value={challengeForm.title} onChange={handleChallengeFormChange} />
          </label>
          <label className="field">
            Slug
            <input name="slug" value={challengeForm.slug} onChange={handleChallengeFormChange} />
          </label>
          <label className="field">
            Difficulty
            <select name="difficulty" value={challengeForm.difficulty} onChange={handleChallengeFormChange}>
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </label>
        </div>
        <label className="field">
          Problem statement
          <textarea name="problemStatement" value={challengeForm.problemStatement} onChange={handleChallengeFormChange} rows={4} />
        </label>
        <label className="field">
          Input specification
          <textarea name="inputSpecification" value={challengeForm.inputSpecification} onChange={handleChallengeFormChange} rows={2} />
        </label>
        <label className="field">
          Output specification
          <textarea name="outputSpecification" value={challengeForm.outputSpecification} onChange={handleChallengeFormChange} rows={2} />
        </label>
        <label className="field">
          Constraints
          <textarea name="constraintsText" value={challengeForm.constraintsText} onChange={handleChallengeFormChange} rows={2} />
        </label>
        <div className="form-strip">
          <label className="field">
            Time limit (ms)
            <input name="timeLimitMs" value={challengeForm.timeLimitMs} onChange={handleChallengeFormChange} />
          </label>
          <label className="field">
            Memory limit (MB)
            <input name="memoryLimitMb" value={challengeForm.memoryLimitMb} onChange={handleChallengeFormChange} />
          </label>
        </div>
        <label className="field">
          Public test cases JSON
          <textarea name="publicTestCases" value={challengeForm.publicTestCases} onChange={handleChallengeFormChange} rows={6} />
        </label>
        <label className="field">
          Hidden test cases JSON
          <textarea name="hiddenTestCases" value={challengeForm.hiddenTestCases} onChange={handleChallengeFormChange} rows={6} />
        </label>
        <button className="primary-button" disabled={adminBusy}>Create Challenge</button>
      </form>
      {adminMessage ? <p className="status">{adminMessage}</p> : null}
      <div className="panel-header submissions-header">
        <div>
          <p className="panel-label">Existing Challenges</p>
          <h2>Challenge library</h2>
        </div>
      </div>
      <div className="submission-list compact">
        {adminChallenges.map((challenge) => (
          <div className="submission-card static" key={challenge._id}>
            <strong>{challenge.title}</strong>
            <span>{challenge.slug}</span>
            <span>{challenge.difficulty}</span>
            <span>
              {challenge.publicTestCases.length} public / {challenge.hiddenTestCaseCount} hidden
            </span>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="app-shell">
      <div className="hero-band">
        <div>
          <p className="eyebrow">Code Runner Judge</p>
        </div>
        {user ? (
          <div className="session-card">
            <span className={`role-pill role-${user.role}`}>{user.role}</span>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
            <button className="secondary-button" onClick={handleLogout}>Log Out</button>
          </div>
        ) : (
          <div className="session-card">
            <p className="session-hint">Sign in to continue</p>
          </div>
        )}
      </div>
      {!user ? renderAuth() : user.role === "student" ? (
        <>
          {renderStudent()}
          <section className="editor-panel standalone-panel">{renderStudentWorkspace()}</section>
        </>
      ) : (
        <>
          {renderAdmin()}
          <section className="editor-panel standalone-panel">{renderAdminTools()}</section>
        </>
      )}
      <Footer />
    </div>
  );
}

export default App;
