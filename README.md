# 🚀 CodeRunner: Secure Remote Code Execution Engine

## 1. Project Overview
CodeRunner is a high-performance, secure, and isolated remote code execution (RCE) engine. It allows users to write code in multiple languages (Python, C++, JavaScript) in a browser-based environment and executes it safely in sandboxed Docker containers. This system mimics the core backend infrastructure of platforms like LeetCode or HackerRank.

## 2. Problem Statement
* **Security Risks:** Running user-submitted code on a server is inherently dangerous and can lead to system compromise.
* **Resource Management:** Unchecked code can consume infinite CPU/RAM, crashing host servers.
* **Latency:** Spinning up isolated environments for every request typically incurs high latency (cold starts).

## 3. Target Users (Personas)
1.  **Student (Sarah):** Learning to code; needs instant feedback on her algorithms without setting up a local IDE.
2.  **Instructor (Prof. Alan):** Needs a platform to create coding assignments and auto-grade student submissions.
3.  **Platform Developer (DevOps Dave):** Wants to integrate a secure "Run Code" button into his educational blog or documentation site.

## 4. Vision Statement
To build a "Zero-Trust" execution engine that is as fast as local development but secure enough to run untrusted code from anywhere, providing a seamless coding experience for education and technical assessment.

## 5. Key Features / Goals
* **Multi-Language Support:** Execute Python, C++, and Node.js.
* **Sandboxed Execution:** 100% isolation using ephemeral Docker containers.
* **Resource Throttling:** Strict CPU and RAM limits per execution.
* **Real-time Monitoring:** metrics for execution time, memory usage, and error rates.
* **Warm Pool Optimization:** Pre-provisioned containers to reduce execution latency to <100ms.

## 6. Success Metrics
* **Latency:** Average execution start time < 200ms.
* **Availability:** 99.9% uptime during load tests.
* **Security:** 100% block rate for malicious system calls (e.g., accessing `/etc/passwd`).

## 7. Assumptions & Constraints
* **Constraint:** Must run within a single-node academic server environment initially.
* **Constraint:** Docker is required for isolation.
* **Assumption:** Users have a stable internet connection for the web IDE.

## 8. Branching Strategy
We follow **GitHub Flow**:
* `main`: Production-ready code.
* `develop`: Integration branch for testing.
* `feature/*`: Feature-specific branches (e.g., `feature/docker-setup`, `feature/api-endpoints`).
* **Rule:** No direct commits to `main`. All changes come via Pull Requests (PRs).

## 9. Quick Start – Local Development
1.  **Clone the Repo:**
    ```bash
    git clone [https://github.com/Sudharshan348/Code-Runner.git]
    cd Code-Runner
    ```
2.  **Start Services (Docker):**
    ```bash
    docker-compose up --build
    ```
3.  **Access:**
    * Frontend: `http://localhost:3000`
    * API Docs: `http://localhost:8000/docs`