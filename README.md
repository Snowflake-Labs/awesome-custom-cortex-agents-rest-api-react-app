
# Overview

This guide provides the instructions to build custom application for the data agents you have already built in your Snowflake account. The LLM orchestration, planning, thinking, deep reasoning, and execution of SQL queries, etc. (similar to [ai.snowflake.com](ai.snowflake.com)) is powered by [Snowflake Cortex Agents](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents) via the [REST API](https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-rest-api) and the interface is built with TypeScript and Material-UI.

Use this as a starter project or template and extend or customize it. Also note that agents can make mistakes, so double-check responses.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Setup Steps](#setup-steps)
    - [1. Clone Repo](#1-clone-repo)
    - [2. Install Dependencies](#2-install-dependencies)
    - [3. Configure Environment Variables](#3-configure-environment-variables)
- [Launch Application](#launch-application)
    - [Demo](#demo)
    - [Usage](#usage)
    - [Implemented Features](#implemented-features)
    - [Future Enhancements](#future-enhancements)
    - [Common Issues](#common-issues)
- [Optimized Build](#optimized-build)
- [Questions](#questions)

---

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Snowflake Account** 
    - With ACCOUNTADMIN role 
    - Personal Access Token (PAT) created for authentication
    - Access to Snowflake Intelligence and at least one Agent

        NOTE: If you have not created an agent or do not have access to one, follow this [step-by-step guide](https://quickstarts.snowflake.com/guide/getting-started-with-snowflake-intelligence/index.html#0). You can then use the same account and interact with that agent in this application.

## Setup Steps

### 1. Clone Repo

Clone this repository to get the required files.

* Folders
    - `src/` 
    - `server/` 
    - `public/`   
* Files
    - `package.json`
    - `tsconfig.json`
    - `env.backend.example`
    - `env.frontend.example`

    > #### Expand to see the source files details.
    <details>

    ```
    ├── src/                                   # Frontend React application (client-side)
    │   ├── components/                        # UI Components
    │   │   ├── Main.tsx                       # Main chat interface
    │   │   ├── ChartVisualization.tsx         # Chart rendering with Recharts
    │   │   ├── ThemeToggle.tsx                # Dark/Light mode toggle
    │   │   └── chat/                          # Chat-specific components
    │   │       ├── ChatHeader.tsx             # Header with agent selector
    │   │       ├── ChatInput.tsx              # Message input with voice support
    │   │       ├── ChatMessage.tsx            # Message display with markdown
    │   │       ├── ChartsSection.tsx          # Chart visualization section
    │   │       ├── EmptyState.tsx             # Empty chat state
    │   │       ├── MarkdownFormatter.tsx      # Markdown rendering
    │   │       ├── SqlQueriesSection.tsx      # SQL query display
    │   │       ├── StarterQuestions.tsx       # Suggested questions
    │   │       ├── ThinkingSteps.tsx          # Agent thinking visualization
    │   │       └── index.ts                   # Component exports
    │   │
    │   ├── hooks/                             # Custom React hooks
    │   │   ├── useAgentConfig.ts              # Agent configuration & loading
    │   │   ├── useAccordionState.ts           # Accordion state management
    │   │   ├── useChatMessages.ts             # Message handling & streaming
    │   │   └── useSpeechRecognition.ts        # Voice input (Web Speech API)
    │   │
    │   ├── services/                          # API services
    │   │   └── snowflakeAgentsApi.ts          # Backend proxy API calls
    │   │
    │   ├── types/                             # TypeScript type definitions
    │   │   ├── chat.ts                        # Chat message types
    │   │   └── chart.ts                       # Chart data types
    │   │
    │   ├── utils/                             # Utility functions
    │   │   └── chatUtils.ts                   # Chat helper functions
    │   │
    │   ├── contexts/                          # React contexts
    │   │   └── ThemeContext.tsx               # Theme state management
    │   │
    │   ├── constants/                         # App constants
    │   │   └── textConstants.ts               # UI text & messages
    │   │
    │   ├── theme/                             # MUI theme configuration
    │   │   └── theme.ts                       # Dark/Light theme definitions
    │   │
    │   ├── config/                            # App configuration
    │   │   └── env.ts                         # Environment variable validation & type-safe access
    │   │
    │   └── index.tsx                          # App entry point
    │
    ├── server/                                # Minimal backend for proxying API requests and securing the PAT (Node.js/Express)
    │   ├── server.js                          # Express server (PAT used only server-side for API calls; never exposed to frontend)
    │   └── constants.js                       # Server constants, error messages, and (if applicable) configuration/env validation
    │
    ├── public/                                # Static assets
    │   ├── images/                            # Logos and icons
    │   │   ├── icons/                         # App icons
    │   │   └── logos/                         # Brand logos
    │   ├── index.html                         # HTML template
    │   ├── manifest.json                      # PWA manifest
    │   ├── robots.txt                         # SEO configuration
    │   └── _headers                           # Security headers for deployment
    │
    ├── build/                                 # Production build output (generated)
    │   ├── static/                            # Compiled JS/CSS bundles
    │   ├── images/                            # Optimized images
    │   ├── index.html                         # Minified HTML
    │   └── _headers                           # Security headers
    │
    ├── package.json                           # Dependencies & npm scripts
    ├── tsconfig.json                          # TypeScript configuration
    │
    ├── env.backend.example                    # Backend environment template
    ├── env.frontend.example                   # Frontend environment template
    ```

    </details>

### 2. Install Dependencies

Browse to the cloned repo folder on your local machine. Then, run the following command in a terminal window.

```bash
npm install
```

This creates the `node_modules/` folder with all required packages.

### 3. Configure Environment Variables

* Copy `env.backend.example` → `.env`

    > NOTE: Update `.env` and add your Snowflake account details

* Copy `env.frontend.example` → `.env.local`

## Launch Application

Browse to the cloned repo folder on your local machine. Then, run the following command in a terminal window to launch both the frontend application and the backend server.

```bash
npm run start:all
```

The application will automatically launch on [http://localhost:3000](http://localhost:3000) in a browser window

### Demo

https://github.com/user-attachments/assets/03cdaf49-51aa-4f8b-8bf8-26310249f169

### Usage 

* Click on one of the starter questions (if any)
* Type in a question/prompt in the text input field in the footer
* To enable voice dictation, click the microphone icon. You will need to grant the necessary audio permissions to your browser. Once permissions are active, you can begin speaking your prompt.

### Implemented Features

* Agent selector
* Example questions (if any) for the selected agent 
* Streaming responses
* Charts and tables
* Citations
* Executed SQL(s) with "Answer accuracy verified by agent owner" indicated when applicable 
* Audio prompt (requires microphone access in the browser)
* Copy-to-clipboard and/or ask the same question
* Copy-to-clipboard the final response
* Light and dark themes

### Future Enhancements

* Threading

### Common Issues

1. **Cannot connect to backend** - Make sure backend server is running: `npm run start:server`

2. **HTTP 400 Bad Request** - Check your SNOWFLAKE_DATABASE and/or SNOWFLAKE_SCHEMA in the backend `.env` file. Make sure they exist and you have access to them. After making changes, restart the development server.

3. **HTTP 401 (Unauthorized) or 403 (Forbidden)** - Check your SNOWFLAKE_PAT (Personal Access Token) in the backend `.env` file. Make sure it's valid and not expired. After making changes, restart the development server.

4. **HTTP 503 Service Unavailable** - Check your SNOWFLAKE_HOST in the backend `.env` file. Make sure it's correct and accessible (format: account.snowflakecomputing.com). After making changes, restart the development server. 

5. **Connection lost during streaming** - The backend server stopped or crashed, network connection was interrupted, or the backend server is no longer running.

6. **CORS errors** - Verify `ALLOWED_ORIGINS` in backend `.env` includes your frontend URL

7. **Voice input not working** - Voice input requires:
   - Chrome, Edge, or Safari browser (not supported in Firefox)
   - Microphone permissions granted to the browser
   - HTTPS connection (required by browser for security)

8. **Port Already in Use**

    If you get an error that port 3000 or 3001 is already in use:

    - Kill process on port 3000 (Frontend):

        ```bash
        # macOS/Linux
        lsof -ti:3000 | xargs kill -9

        # Windows (PowerShell)
        Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
        ```

    - Kill process on port 3001 (Backend):

        ```bash
        # macOS/Linux
        lsof -ti:3001 | xargs kill -9

        # Windows (PowerShell)
        Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force
        ```

    - Kill both ports at once (macOS/Linux):

        ```bash
        lsof -ti:3000,3001 | xargs kill -9
        ```

## Optimized Build

Browse to the cloned repo folder on your local machine. Then, run the following command in a terminal window.

```bash
npm run build
```

This creates an optimized build in the `/build` folder with:

- Minified JavaScript bundles
- No source maps (GENERATE_SOURCEMAP=false)
- Optimized assets
- Security headers (_headers file)

If you're going to run the backend on a different service/server/platform, then build using the following:

```bash
REACT_APP_BACKEND_URL=<YOUR_BACKEND_URL> npm run build
```

Examples:

```bash
REACT_APP_BACKEND_URL=https://my-service.onrender.com npm run build
REACT_APP_BACKEND_URL=https://my-api.herokuapp.com npm run build
REACT_APP_BACKEND_URL=https://api.railway.app npm run build
REACT_APP_BACKEND_URL=https://my-function.vercel.app npm run build
```

## Questions

If you have any questions, comments or feedack, reach out to [Dash DesAI](https://www.linkedin.com/in/dash-desai/).
