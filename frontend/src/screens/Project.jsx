


import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { UserContext } from '../context/user.context';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import { initializeSocket, receiveMessage, sendMessage, removeMessageListener } from '../config/socket';
import Markdown from 'markdown-to-jsx';
import hljs from 'highlight.js';
import { getWebContainer } from '../config/webContainer'; // Corrected import path case

// Import specific language definitions for highlight.js
import 'highlight.js/styles/atom-one-dark.css';

import javascript from 'highlight.js/lib/languages/javascript';
import xml from 'highlight.js/lib/languages/xml'; // For HTML
import css from 'highlight.js/lib/languages/css';
import python from 'highlight.js/lib/languages/python';
import cpp from 'highlight.js/lib/languages/cpp';
import java from 'highlight.js/lib/languages/java';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('python', python);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('java', java);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);


// Helper function to map file extensions to highlight.js language names
const getLanguageFromFileName = (fileName) => {
    const ext = fileName.split('.').pop();
    switch (ext) {
        case 'js':
        case 'jsx':
        case 'ts':
        case 'tsx':
            return 'javascript';
        case 'html':
        case 'htm':
            return 'html';
        case 'css':
            return 'css';
        case 'json':
            return 'json';
        case 'md':
            return 'markdown';
        case 'py':
            return 'python';
        case 'java':
            return 'java';
        case 'cpp':
        case 'cxx':
        case 'c++':
            return 'cpp';
        default:
            return 'plaintext';
    }
};

// Standalone component for syntax-highlighted code blocks within Markdown.
function SyntaxHighlightedCode(props) {
    const ref = useRef(null);
    const languageClass = props.className?.split(' ').find(cls => cls.startsWith('lang-'));
    const language = languageClass ? languageClass.substring(5) : 'plaintext';

    useEffect(() => {
        if (ref.current && language !== 'plaintext' && hljs.getLanguage(language)) {
            hljs.highlightElement(ref.current);
            ref.current.removeAttribute('data-highlighted');
        }
    }, [language, props.children]);

    return <code {...props} ref={ref} />;
}

// Standalone component for displaying AI messages in the chat.
const WriteAiMessage = React.memo(({ messageContent }) => {
    if (!messageContent) {
        return <p className="text-gray-400">[No content]</p>;
    }

    return (
        <div className='overflow-auto bg-slate-950 text-white rounded-sm p-2'>
            <Markdown
                children={messageContent}
                options={{
                    overrides: {
                        code: SyntaxHighlightedCode,
                    },
                }}
            />
        </div>
    );
});


const Project = () => {
    const location = useLocation();
    const { projectId: urlProjectId } = useParams();
    const navigate = useNavigate();

    const [project, setProject] = useState(location.state?.project || null);
    const [isLoadingProject, setIsLoadingProject] = useState(true);

    const [isAddCollaboratorModalOpen, setIsAddCollaboratorModalOpen] = useState(false);
    const [isCurrentCollaboratorsModalOpen, setIsCurrentCollaboratorsModalOpen] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState(new Set());
    const [message, setMessage] = useState('');
    const { user } = useContext(UserContext);
    const messageBoxRef = useRef(null);

    const [availableUsers, setAvailableUsers] = useState([]);
    const [chatMessages, setChatMessages] = useState([]);
    const [fileTree, setFileTree] = useState({});

    const [currentFile, setCurrentFile] = useState(null);
    const [openFiles, setOpenFiles] = useState([]);

    const [webContainer, setWebContainer] = useState(null);
    const [iframeUrl, setIframeUrl] = useState(null);
    const [runProcess, setRunProcess] = useState(null);
    const [terminalOutput, setTerminalOutput] = useState('');

    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isWebContainerReady, setIsWebContainerReady] = useState(false);
    const [isProjectRunning, setIsProjectRunning] = useState(false);
    const [isSocketConnected, setIsSocketConnected] = useState(false);

    // --- Dynamic Layout States ---
    const [chatPanelWidth, setChatPanelWidth] = useState(300);
    const [explorerWidth, setExplorerWidth] = useState(250);
    const [codeEditorHeight, setCodeEditorHeight] = useState(window.innerHeight * 0.6);
    const [previewPanelWidth, setPreviewPanelWidth] = useState(400);

    // Min/Max widths/heights for resizing
    const minChatPanelWidth = 250;
    const maxChatPanelWidth = 500;
    const minExplorerWidth = 150;
    const maxExplorerWidth = 400;
    const minCodeEditorHeight = 150;
    const maxCodeEditorHeight = window.innerHeight * 0.8;
    const minPreviewPanelWidth = 300;
    const maxPreviewPanelWidth = 800;

    // Refs for resizers
    const chatResizerRef = useRef(null);
    const explorerResizerRef = useRef(null);
    const editorTerminalResizerRef = useRef(null);
    const previewResizerRef = useRef(null);

    // --- Resizing Logic ---
    const startResizing = useCallback((e, type) => {
        e.preventDefault();
        document.body.style.cursor = type === 'editor' ? 'ns-resize' : 'ew-resize';
        document.body.style.userSelect = 'none';

        const mouseMoveHandler = (moveEvent) => {
            if (type === 'chat') {
                const newWidth = moveEvent.clientX;
                setChatPanelWidth(Math.max(minChatPanelWidth, Math.min(maxChatPanelWidth, newWidth)));
            } else if (type === 'explorer') {
                const newWidth = moveEvent.clientX - (chatResizerRef.current ? chatResizerRef.current.getBoundingClientRect().right : 0);
                setExplorerWidth(Math.max(minExplorerWidth, Math.min(maxExplorerWidth, newWidth)));
            } else if (type === 'editor') {
                const parentRect = editorTerminalResizerRef.current.parentElement.getBoundingClientRect();
                const newHeight = moveEvent.clientY - parentRect.top;
                setCodeEditorHeight(Math.max(minCodeEditorHeight, Math.min(maxCodeEditorHeight, newHeight)));
            } else if (type === 'preview') {
                const newWidth = window.innerWidth - moveEvent.clientX;
                setPreviewPanelWidth(Math.max(minPreviewPanelWidth, Math.min(maxPreviewPanelWidth, newWidth)));
            }
        };

        const mouseUpHandler = () => {
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    }, []);


    // --- Effect to load project data ---
    useEffect(() => {
        const loadProject = async () => {
            setIsLoadingProject(true);
            let currentProject = location.state?.project; // Try to get from state first

            if (!currentProject && urlProjectId) { // If not in state, but ID is in URL, fetch it
                try {
                    const res = await axios.get(`/projects/${urlProjectId}`); // Assuming backend route is /projects/:id
                    currentProject = res.data.project;
                } catch (err) {
                    console.error("Error fetching project by ID:", err);
                    navigate('/home', { replace: true, state: { message: 'Project not found or accessible.', type: 'error' } });
                    setIsLoadingProject(false);
                    return;
                }
            }

            if (currentProject) {
                setProject(currentProject);
                if (currentProject.fileTree && Object.keys(currentProject.fileTree).length > 0) {
                    setFileTree(currentProject.fileTree);
                    const firstFile = Object.keys(currentProject.fileTree)[0];
                    if (firstFile) {
                        setCurrentFile(firstFile);
                        setOpenFiles([firstFile]);
                    }
                }
            } else {
                navigate('/home', { replace: true, state: { message: 'No project selected.', type: 'error' } });
            }
            setIsLoadingProject(false);
        };

        loadProject();
    }, [urlProjectId, location.state?.project, navigate]);


    // Effect to fetch all users for the "Add Collaborator" modal
    useEffect(() => {
        const fetchAllUsers = async () => {
            setIsLoadingUsers(true);
            try {
                const res = await axios.get("/users/all");
                const currentProjectUserIds = new Set(project?.users.map(u => u._id));
                const allUsersFromBackend = res.data.users || [];
                const filteredUsers = allUsersFromBackend.filter(u => !currentProjectUserIds.has(u._id));
                setAvailableUsers(filteredUsers);
            } catch (err) {
                console.error("Error fetching all users:", err);
            } finally {
                setIsLoadingUsers(false);
            }
        };

        if (isAddCollaboratorModalOpen) {
            fetchAllUsers();
        } else {
            setSelectedUserIds(new Set());
        }
    }, [isAddCollaboratorModalOpen, project?.users]);

    // Callback for adding collaborators.
    const addCollaborators = useCallback(async () => {
        if (selectedUserIds.size === 0) {
            return;
        }
        try {
            const res = await axios.put("/projects/add-user", {
                projectId: project._id,
                users: Array.from(selectedUserIds)
            });
            console.log("Collaborators added:", res.data);
            const newlyAddedUsers = availableUsers.filter(u => selectedUserIds.has(u._id));
            setProject(prev => ({
                ...prev,
                users: [...prev.users, ...newlyAddedUsers]
            }));
            setIsAddCollaboratorModalOpen(false);
            setSelectedUserIds(new Set());
        } catch (err) {
            console.error("Error adding collaborators:", err);
        }
    }, [selectedUserIds, project?._id, availableUsers]);

    // Callback for sending chat messages (now handles AI prefix)
    const sendChatMessage = useCallback(() => {
        if (!message.trim()) return;
        if (!isSocketConnected) {
            console.warn("Socket not connected. Message not sent.");
            setTerminalOutput(prev => prev + "\nError: Chat not available. Socket not connected.\n");
            return;
        }

        let messageToSend = message;
        let eventType = 'project-message'; // Default event type

        if (message.startsWith('@ai ')) {
            messageToSend = message.substring(4).trim();
            eventType = 'ai-prompt'; // Specific event type for AI
            console.log("Frontend: Sending AI prompt:", messageToSend);
            setFileTree({}); // Clear file tree on new AI project request
            setCurrentFile(null);
            setOpenFiles([]);
            setTerminalOutput("AI: Generating new project...\n");
        } else {
            console.log("Frontend: Sending regular chat message:", messageToSend);
        }

        // Send message via socket
        sendMessage(eventType, {
            message: messageToSend,
            sender: user,
            projectId: project._id
        });

        // Optimistically add user's message to chat display
        setChatMessages(prevMessages => [...prevMessages, { sender: user, message: message }]);
        setMessage(""); // Clear input field
    }, [message, user, project?._id, isSocketConnected]);


    // Effect for initializing WebContainer
    useEffect(() => {
        const initWebContainer = async () => {
            setIsWebContainerReady(false);
            setTerminalOutput(prev => prev + "Initializing WebContainer...\n");
            try {
                const container = await getWebContainer();
                setWebContainer(container);
                setIsWebContainerReady(true);
                setTerminalOutput(prev => prev + "WebContainer started successfully.\n");
                console.log("WebContainer started.");

                container.on('server-ready', (port, url) => {
                    console.log(`WebContainer server ready at URL: ${url} on port ${port}`);
                    setIframeUrl(url);
                    setIsProjectRunning(true);
                    setTerminalOutput(prev => prev + `Project server running on port ${port}. Preview available.\n`);
                });

                container.on('error', (err) => {
                    console.error('WebContainer error:', err);
                    setTerminalOutput(prev => prev + `\nWebContainer Error: ${err.message}\n`);
                    setIsProjectRunning(false);
                });

                container.on('port', (port) => {
                    console.log(`WebContainer exposed port: ${port}`);
                });

            } catch (err) {
                console.error("Failed to initialize WebContainer:", err);
                setTerminalOutput(prev => prev + `\nFailed to initialize WebContainer: ${err.message}\n`);
                setIsWebContainerReady(false);
            }
        };

        if (!webContainer) {
            initWebContainer();
        }
    }, [webContainer]);


    // Effect for initializing socket and handling incoming messages
    useEffect(() => {
        // Only attempt to initialize socket if project and its ID are available
        if (!project?._id) {
            console.warn("Project ID not available for socket initialization. Skipping socket setup.");
            setIsSocketConnected(false);
            return;
        }

        const socket = initializeSocket(project._id);

        const handleConnect = () => {
            setIsSocketConnected(true);
            setTerminalOutput(prev => prev + "\nSocket connected to collaboration server.\n");
        };
        const handleDisconnect = (reason) => {
            setIsSocketConnected(false);
            setTerminalOutput(prev => prev + `\nSocket disconnected: ${reason}.\n`);
        };
        const handleConnectError = (err) => {
            console.error('Socket connect_error:', err);
            setIsSocketConnected(false);
            setTerminalOutput(prev => prev + `\nSocket Connection Error: ${err.message}\n`);
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);


        const handleIncomingMessage = async (data) => {
            console.log("Received raw message:", data);

            // Process AI messages to extract content
            if (data.sender?._id === 'ai' && data.message) {
                let aiContentForChat = ''; // Initialize as empty string
                let aiPayload = {};

                try {
                    aiPayload = JSON.parse(data.message);
                    // The AI's response format (from ai.service.js) typically has 'text' for simple messages
                    // and 'fileTree', 'buildCommand', 'startCommand' for code projects.

                    // Check if it's a code project based on presence of fileTree
                    if (aiPayload.fileTree && typeof aiPayload.fileTree === 'object' && Object.keys(aiPayload.fileTree).length > 0) {
                        aiContentForChat = typeof aiPayload.text === 'string' // Use aiPayload.text for description
                            ? aiPayload.text
                            : "AI has generated a project for you. Check the file explorer and terminal!";

                        setFileTree(aiPayload.fileTree);
                        console.log("AI provided fileTree:", aiPayload.fileTree);
                        console.log("Files in received fileTree:", Object.keys(aiPayload.fileTree));

                        // Automatically open the first file if a fileTree is provided
                        const firstFile = Object.keys(aiPayload.fileTree)[0];
                        if (firstFile) {
                            setCurrentFile(firstFile);
                            setOpenFiles([firstFile]);
                        }

                        // Handle build and start commands in terminal output
                        let commandOutput = "";
                        if (aiPayload.buildCommand && aiPayload.buildCommand.mainItem && Array.isArray(aiPayload.buildCommand.commands)) {
                            commandOutput += `\nAI suggested build command: ${aiPayload.buildCommand.mainItem} ${aiPayload.buildCommand.commands.join(' ')}\n`;
                        }
                        if (aiPayload.startCommand && aiPayload.startCommand.mainItem && Array.isArray(aiPayload.startCommand.commands)) {
                            commandOutput += `AI suggested start command: ${aiPayload.startCommand.mainItem} ${aiPayload.startCommand.commands.join(' ')}\n`;
                        }
                        setTerminalOutput(prev => prev + commandOutput);

                        // Removed automatic project run here. User will click 'Run Project' button.
                        // The WebContainer mount is still here, but running is separate.
                        if (isWebContainerReady && webContainer) {
                            setTerminalOutput(prev => prev + "\nAI: Mounting generated files to WebContainer...\n");
                            await webContainer.mount(aiPayload.fileTree).then(() => {
                                console.log("AI file tree mounted to WebContainer.");
                                setTerminalOutput(prev => prev + "AI: Files mounted. Click 'Run Project' to launch.\n");
                            }).catch(err => {
                                console.error("Error mounting AI file tree:", err);
                                setTerminalOutput(prev => prev + `\nError mounting AI files: ${err.message}\n`);
                            });
                        } else {
                            console.warn("WebContainer not ready to mount fileTree from AI message. Will try again when ready.");
                            setTerminalOutput(prev => prev + "AI: WebContainer not yet ready to mount files. Please wait for initialization and click 'Run Project'.\n");
                        }

                    } else if (aiPayload.text) { // If it's a simple text response
                        aiContentForChat = aiPayload.text;
                    } else {
                        console.warn("AI JSON message has unknown format or missing expected content fields:", aiPayload);
                        aiContentForChat = JSON.stringify(aiPayload, null, 2); // Show formatted JSON if nothing else works
                    }

                } catch (e) {
                    console.warn("AI message is not valid JSON, treating as plain text for chat:", e, data.message);
                    aiContentForChat = data.message; // Fallback to original string if parsing fails
                }

                // Update the message object's content before adding to chatMessages
                // This ensures the displayed message is the parsed text, not raw JSON
                setChatMessages(prev => [...prev, { ...data, message: aiContentForChat }]);

            } else {
                // For non-AI messages, add directly
                setChatMessages(prev => [...prev, data]);
            }
        };

        receiveMessage('project-message', handleIncomingMessage);

        return () => {
            removeMessageListener('project-message', handleIncomingMessage);
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('connect_error', handleConnectError);
        };
    }, [project?._id, webContainer, isWebContainerReady]);

    // Callback for saving file tree changes to the backend
    const saveFileTree = useCallback(async (ft) => {
        try {
            const res = await axios.put('/projects/update-file-tree', {
                projectId: project._id,
                fileTree: ft
            });
            console.log("File tree saved:", res.data);
        } catch (err) {
            console.error("Error saving file tree:", err);
        }
    }, [project?._id]);

    // Effect to scroll chat messages to bottom whenever they change
    useEffect(() => {
        if (messageBoxRef.current) {
            messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
        }
    }, [chatMessages]);

    // Function to stop the currently running process
    const stopProject = useCallback(() => {
        if (runProcess) {
            runProcess.kill();
            setRunProcess(null);
            setIsProjectRunning(false);
            setIframeUrl(null);
            setTerminalOutput(prev => prev + "\n--- Project Stopped ---\n");
            console.log("Project process killed.");
        } else {
            setTerminalOutput(prev => prev + "\nNo project is currently running to stop.\n");
        }
    }, [runProcess]);

    // Function to run the project
    const runProject = useCallback(async () => {
        if (!webContainer || !isWebContainerReady) {
            console.error("WebContainer not initialized or not ready.");
            setTerminalOutput(prev => prev + "\nError: WebContainer not initialized or not ready. Please wait or refresh.\n");
            return;
        }
        if (Object.keys(fileTree).length === 0) {
            setTerminalOutput(prev => prev + "\nNo files in project to run. Ask AI to generate a project first.\n");
            return;
        }

        setTerminalOutput(prev => prev + "\n--- Running Project ---\n");
        setTerminalOutput(prev => prev + "Mounting files...\n");
        await webContainer.mount(fileTree); // Ensure files are mounted before running
        setTerminalOutput(prev => prev + "Files mounted.\n");

        if (runProcess) {
            setTerminalOutput(prev => prev + "Stopping previous process...\n");
            runProcess.kill();
            await runProcess.exit;
            setRunProcess(null);
            setTerminalOutput(prev => prev + "Previous process stopped.\n");
        }

        let process;
        let exitCode;
        let buildCommand = null;
        let startCommand = null;

        // Try to get build/start commands from fileTree (if AI provided them)
        if (fileTree['package.json']) {
            try {
                const packageJsonContent = JSON.parse(fileTree['package.json'].file.contents);
                if (packageJsonContent.scripts) {
                    if (packageJsonContent.scripts.install) { // Check for a custom 'install' script
                        buildCommand = { mainItem: "npm", commands: ["install"] };
                    }
                    if (packageJsonContent.scripts.start) { // Check for a custom 'start' script
                        startCommand = { mainItem: "npm", commands: ["start"] };
                    }
                }
            } catch (e) {
                console.error("Error parsing package.json for commands:", e);
                setTerminalOutput(prev => prev + "\nError: Could not parse package.json for build/start commands.\n");
            }
        }
        // Fallback to AI's suggested commands if not found in package.json or for other languages
        if (!buildCommand && project?.aiBuildCommand) buildCommand = project.aiBuildCommand;
        if (!startCommand && project?.aiStartCommand) startCommand = project.aiStartCommand;


        // Execute build command
        if (buildCommand && buildCommand.mainItem && Array.isArray(buildCommand.commands)) {
            setTerminalOutput(prev => prev + `Running build command: ${buildCommand.mainItem} ${buildCommand.commands.join(' ')}\n`);
            process = await webContainer.spawn(buildCommand.mainItem, buildCommand.commands);
            process.output.pipeTo(new WritableStream({
                write(chunk) { setTerminalOutput(prev => prev + chunk); }
            }));
            exitCode = await process.exit;
            setTerminalOutput(prev => prev + `Build command exited with code: ${exitCode}\n`);

            if (exitCode !== 0) {
                setTerminalOutput(prev => prev + "Build failed. Cannot start server.\n");
                setIsProjectRunning(false);
                return;
            }
        } else {
            setTerminalOutput(prev => prev + "No explicit build command found or provided by AI. Skipping build step.\n");
        }

        // Execute start command
        if (startCommand && startCommand.mainItem && Array.isArray(startCommand.commands)) {
            setTerminalOutput(prev => prev + `Running start command: ${startCommand.mainItem} ${startCommand.commands.join(' ')}\n`);
            process = await webContainer.spawn(startCommand.mainItem, startCommand.commands);
            process.output.pipeTo(new WritableStream({
                write(chunk) { setTerminalOutput(prev => prev + chunk); }
            }));
            setRunProcess(process);
            setIsProjectRunning(true);

            process.exit.then((exitCode) => {
                setTerminalOutput(prev => prev + `\nProject process exited with code: ${exitCode}\n`);
                setIsProjectRunning(false);
                setRunProcess(null);
                setIframeUrl(null);
            });
        } else {
            setTerminalOutput(prev => prev + "No explicit start command found or provided by AI. Project not automatically launched.\n");
            setIsProjectRunning(false);
        }

    }, [webContainer, isWebContainerReady, fileTree, runProcess, project?.aiBuildCommand, project?.aiStartCommand]); // Added AI commands to deps

    // Render loading state if project data isn't available yet
    if (isLoadingProject) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-400 text-xl font-inter">Loading project data...</div>;
    }

    // If project is null after loading, redirect to home
    if (!project) {
        return null;
    }

    // Determine collaborators to display (max 3 + overflow)
    const displayedCollaborators = project.users ? project.users.slice(0, 3) : [];
    const remainingCollaboratorsCount = project.users ? project.users.length - 3 : 0;


    return (
        <main className='flex h-screen w-screen font-inter overflow-hidden bg-gray-900 text-gray-100'>
            {/* Leftmost Panel: Chat and Collaborators */}
            <div
                className="flex flex-col bg-gray-800 border-r border-gray-700 shadow-lg transition-all duration-100 ease-out overflow-hidden"
                style={{ width: `${chatPanelWidth}px` }}
            >
                <header className='flex justify-between items-center p-2 px-4 w-full bg-gray-700 border-b border-gray-600 shadow-sm z-10'>
                    <button className='flex gap-2 items-center text-blue-400 hover:text-blue-300 transition-colors' onClick={() => setIsAddCollaboratorModalOpen(true)}>
                        <i className="ri-user-add-line mr-1"></i>
                        <p className="text-sm">Add collaborator</p>
                    </button>
                    <div className="flex items-center gap-2">
                        {displayedCollaborators.map(projectUser => (
                            <div key={projectUser._id} className="aspect-square rounded-full w-7 h-7 flex items-center justify-center text-white bg-blue-600 text-sm" title={projectUser.email}>
                                {projectUser.email ? projectUser.email[0].toUpperCase() : 'U'}
                            </div>
                        ))}
                        {remainingCollaboratorsCount > 0 && (
                            <button
                                onClick={() => setIsCurrentCollaboratorsModalOpen(true)}
                                className="aspect-square rounded-full w-7 h-7 flex items-center justify-center text-white bg-gray-600 text-xs font-bold hover:bg-gray-500 transition-colors"
                                title={`View all ${project.users.length} collaborators`}
                            >
                                +{remainingCollaboratorsCount}
                            </button>
                        )}
                    </div>
                </header>
                <div
                    ref={messageBoxRef}
                    className="message-box p-3 flex-grow flex flex-col gap-2 overflow-y-auto scrollbar-hide"
                >
                    {chatMessages.map((msg, index) => (
                        <div key={index} className={`${msg.sender?._id === user._id?.toString() ? 'ml-auto bg-blue-700 text-white' : 'bg-gray-700 text-gray-200'}
                            message flex flex-col p-3 w-fit rounded-lg shadow-md max-w-[75%] break-words`}>
                            <small className='opacity-75 text-xs font-semibold mb-1'>{msg.sender?.email || "Unknown"}</small>
                            <div className='text-sm'>
                                {msg.sender?._id === 'ai' ?
                                    <WriteAiMessage messageContent={msg.message} />
                                    : <p>{msg.message}</p>}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="inputField w-full flex border-t border-gray-700 bg-gray-800">
                    <input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className='p-3 px-4 border-none outline-none flex-grow bg-gray-700 text-gray-100 placeholder-gray-400 rounded-bl-lg'
                        type="text"
                        placeholder='Enter message (@ai for AI)'
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                sendChatMessage();
                            }
                        }}
                    />
                    <button
                        onClick={sendChatMessage}
                        className='px-5 bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center rounded-br-lg'
                    >
                        <i className="ri-send-plane-fill text-lg"></i>
                    </button>
                </div>
            </div>

            {/* Resizer 1 (Between Chat/Collab and File Explorer) */}
            <div
                ref={chatResizerRef}
                onMouseDown={(e) => startResizing(e, 'chat')}
                className="w-2 bg-gray-700 cursor-ew-resize hover:bg-blue-600 transition-colors duration-200 flex items-center justify-center group"
            >
                <div className="w-1 h-10 bg-gray-600 rounded-full group-hover:bg-blue-300 transition-colors"></div>
            </div>

            {/* Middle Section: File Explorer, Code Editor, Terminal */}
            <div className="flex flex-grow h-full overflow-hidden">
                {/* File Explorer Panel */}
                <div
                    className="explorer flex-shrink-0 bg-gray-800 border-r border-gray-700 overflow-y-auto"
                    style={{ width: `${explorerWidth}px` }}
                >
                    <div className="file-tree w-full">
                        <h2 className="text-lg font-bold p-3 px-4 bg-gray-700 text-blue-300 border-b border-gray-600">Files</h2>
                        {Object.keys(fileTree).length === 0 ? (
                            <p className="p-4 text-gray-500 text-sm">No files in project. Ask AI to generate some!</p>
                        ) : (
                            Object.keys(fileTree).map((fileName) => (
                                <button
                                    key={fileName}
                                    onClick={() => {
                                        setCurrentFile(fileName);
                                        setOpenFiles(prev => [...new Set([...prev, fileName])]);
                                    }}
                                    className={`tree-element cursor-pointer p-2 px-4 flex items-center gap-2 w-full text-left text-gray-200
                                                ${currentFile === fileName ? 'bg-blue-900/50 font-semibold' : 'hover:bg-gray-700'} transition-colors`}
                                >
                                    <p>{fileName}</p>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Resizer 2 (Between File Explorer and Code Editor/Terminal) */}
                <div
                    ref={explorerResizerRef}
                    onMouseDown={(e) => startResizing(e, 'explorer')}
                    className="w-2 bg-gray-700 cursor-ew-resize hover:bg-blue-600 transition-colors duration-200 flex items-center justify-center group"
                >
                    <div className="w-1 h-10 bg-gray-600 rounded-full group-hover:bg-blue-300 transition-colors"></div>
                </div>

                {/* Code Editor & Terminal Area */}
                <div className="flex flex-col flex-grow overflow-hidden">
                    {/* Top Bar: File Tabs & Run/Stop Buttons */}
                    <div className="top-bar flex justify-between w-full bg-gray-800 items-center border-b border-gray-700 flex-shrink-0">
                        {/* File Tabs - Now scrollable */}
                        <div className="files flex overflow-x-auto flex-grow whitespace-nowrap scrollbar-hide">
                            {openFiles.map((fileName) => (
                                <button
                                    key={fileName}
                                    onClick={() => setCurrentFile(fileName)}
                                    className={`open-file cursor-pointer p-2 px-4 flex items-center w-fit gap-2 text-gray-200
                                                ${currentFile === fileName ? 'bg-blue-900/50 font-semibold' : 'hover:bg-gray-700'} transition-colors`}
                                >
                                    <p>{fileName}</p>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenFiles(prev => prev.filter(f => f !== fileName));
                                            if (currentFile === fileName) {
                                                const remainingOpenFiles = prev.filter(f => f !== fileName);
                                                setCurrentFile(remainingOpenFiles.length > 0 ? remainingOpenFiles[0] : null);
                                            }
                                        }}
                                        className="text-gray-400 hover:text-gray-100 ml-2 text-sm"
                                    >
                                        <i className="ri-close-line"></i>
                                    </button>
                                </button>
                            ))}
                        </div>

                        {/* Actions (Run/Stop Buttons) - Now fixed and shrink-0 */}
                        <div className="actions flex gap-2 p-2 flex-shrink-0">
                            <button
                                onClick={runProject} // Changed to call the new runProject function
                                className={`p-2 px-4 rounded-md transition-colors flex items-center gap-2
                                            ${!isWebContainerReady || isProjectRunning ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                                disabled={!isWebContainerReady || isProjectRunning}
                            >
                                {!isWebContainerReady ? (
                                    <>
                                        <i className="ri-loader-4-line animate-spin"></i>
                                        Initializing...
                                    </>
                                ) : isProjectRunning ? (
                                    <>
                                        <i className="ri-play-fill"></i>
                                        Running...
                                    </>
                                ) : (
                                    <>
                                        <i className="ri-play-fill"></i>
                                        Run Project
                                    </>
                                )}
                            </button>

                            <button
                                onClick={stopProject}
                                className={`p-2 px-4 rounded-md transition-colors flex items-center gap-2
                                            ${!isProjectRunning ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white`}
                                disabled={!isProjectRunning}
                            >
                                <i className="ri-stop-fill"></i>
                                Stop
                            </button>
                        </div>
                    </div>

                    {/* Code Editor Area */}
                    <div
                        className="code-editor-area flex-shrink-0 bg-gray-800 overflow-auto"
                        style={{ height: `${codeEditorHeight}px` }}
                    >
                        {currentFile && fileTree[currentFile] ? (
                            <pre className="hljs h-full p-4">
                                <code
                                    className={`hljs h-full outline-none text-sm lang-${getLanguageFromFileName(currentFile)}`}
                                    contentEditable
                                    suppressContentEditableWarning
                                    onBlur={(e) => {
                                        const updatedContent = e.target.innerText;
                                        const updatedFileTree = {
                                            ...fileTree,
                                            [currentFile]: {
                                                file: {
                                                    contents: updatedContent
                                                }
                                            }
                                        };
                                        setFileTree(updatedFileTree);
                                        saveFileTree(updatedFileTree);
                                    }}
                                    dangerouslySetInnerHTML={{
                                        __html: hljs.highlight(
                                            getLanguageFromFileName(currentFile),
                                            fileTree[currentFile].file.contents
                                        ).value
                                    }}
                                    style={{ whiteSpace: 'pre-wrap' }}
                                />
                            </pre>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500 text-center p-4">
                                {Object.keys(fileTree).length > 0 ? "Select a file from the explorer to edit." : "No files available. Ask AI to generate a project (e.g., '@ai create a simple Node.js server')."}
                            </div>
                        )}
                    </div>

                    {/* Resizer 3 (Between Code Editor and Terminal) */}
                    <div
                        ref={editorTerminalResizerRef}
                        onMouseDown={(e) => startResizing(e, 'editor')}
                        className="h-2 bg-gray-700 cursor-ns-resize hover:bg-blue-600 transition-colors duration-200 flex items-center justify-center group"
                    >
                        <div className="h-1 w-10 bg-gray-600 rounded-full group-hover:bg-blue-300 transition-colors"></div>
                    </div>

                    {/* Terminal Output Area */}
                    <div className="terminal-output flex-grow bg-gray-900 text-green-400 p-3 overflow-auto text-sm font-mono border-t border-gray-700">
                        <h3 className="font-bold text-gray-300 mb-2">Terminal Output:</h3>
                        <pre className="whitespace-pre-wrap">{terminalOutput}</pre>
                    </div>
                </div>
            </div>

            {/* Resizer 4 (Between Code Editor/Terminal Area and Preview) - Only if preview is active */}
            {iframeUrl && (
                <div
                    ref={previewResizerRef}
                    onMouseDown={(e) => startResizing(e, 'preview')}
                    className="w-2 bg-gray-700 cursor-ew-resize hover:bg-blue-600 transition-colors duration-200 flex items-center justify-center group"
                >
                    <div className="w-1 h-10 bg-gray-600 rounded-full group-hover:bg-blue-300 transition-colors"></div>
                </div>
            )}

            {/* Rightmost Panel: Preview Iframe */}
            {iframeUrl && (
                <div
                    className="flex flex-col h-full bg-gray-800 border-l border-gray-700 shadow-lg transition-all duration-100 ease-out overflow-hidden"
                    style={{ width: `${previewPanelWidth}px` }}
                >
                    <div className="address-bar p-2 bg-gray-700 border-b border-gray-600">
                        <input
                            type="text"
                            value={iframeUrl}
                            className="w-full p-1 px-2 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 bg-gray-800"
                            readOnly
                        />
                    </div>
                    <iframe src={iframeUrl} className="w-full h-full border-0" title="Project Preview"></iframe>
                </div>
            )}

            {/* Add Collaborator Modal */}
            {isAddCollaboratorModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-6 rounded-lg w-96 max-w-full relative shadow-2xl border border-gray-700 text-gray-100">
                        <header className='flex justify-between items-center mb-4 border-b border-gray-700 pb-3'>
                            <h2 className='text-2xl font-bold text-blue-300'>Select Users to Add</h2>
                            <button onClick={() => setIsAddCollaboratorModalOpen(false)} className='p-2 text-gray-400 hover:text-gray-100 text-xl transition-colors'>
                                <i className="ri-close-fill"></i>
                            </button>
                        </header>
                        <div className="users-list flex flex-col gap-2 mb-6 max-h-80 overflow-y-auto">
                            {isLoadingUsers ? (
                                <p className="text-gray-500 text-center py-4">Loading users...</p>
                            ) : availableUsers.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No new users available to add.</p>
                            ) : (
                                availableUsers.map(u => (
                                    <div
                                        key={u._id}
                                        className={`user cursor-pointer hover:bg-gray-700 ${selectedUserIds.has(u._id) ? 'bg-blue-900/50 border-blue-600 border' : 'bg-gray-700 border border-gray-600'} p-3 flex gap-3 items-center rounded-md transition-all duration-200 shadow-sm`}
                                        onClick={() => setSelectedUserIds(prev => {
                                            const newSet = new Set(prev);
                                            if (newSet.has(u._id)) {
                                                newSet.delete(u._id);
                                            } else {
                                                newSet.add(u._id);
                                            }
                                            return newSet;
                                        })}
                                    >
                                        <div className='aspect-square rounded-full w-10 h-10 flex items-center justify-center text-white bg-blue-600 text-2xl'>
                                            {u.email ? u.email[0].toUpperCase() : 'U'}
                                        </div>
                                        <h1 className='font-semibold text-lg text-gray-200'>{u.email}</h1>
                                        {selectedUserIds.has(u._id) && (
                                            <i className="ri-check-circle-fill text-green-500 text-xl ml-auto"></i>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        <button
                            onClick={addCollaborators}
                            disabled={selectedUserIds.size === 0 || isLoadingUsers}
                            className='w-full px-5 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold'
                        >
                            Add Collaborators ({selectedUserIds.size})
                        </button>
                    </div>
                </div>
            )}

            {/* Current Collaborators List Modal */}
            {isCurrentCollaboratorsModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-gray-800 p-6 rounded-lg w-96 max-w-full relative shadow-2xl border border-gray-700 text-gray-100">
                        <header className='flex justify-between items-center mb-4 border-b border-gray-700 pb-3'>
                            <h2 className='text-2xl font-bold text-blue-300'>All Collaborators</h2>
                            <button onClick={() => setIsCurrentCollaboratorsModalOpen(false)} className='p-2 text-gray-400 hover:text-gray-100 text-xl transition-colors'>
                                <i className="ri-close-fill"></i>
                            </button>
                        </header>
                        <div className="users-list flex flex-col gap-2 mb-6 max-h-80 overflow-y-auto">
                            {project.users && project.users.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No collaborators yet.</p>
                            ) : (
                                project.users.map(u => (
                                    <div key={u._id} className="user p-3 flex gap-3 items-center rounded-md bg-gray-700 border border-gray-600 shadow-sm">
                                        <div className='aspect-square rounded-full w-10 h-10 flex items-center justify-center text-white bg-blue-600 text-2xl'>
                                            {u.email ? u.email[0].toUpperCase() : 'U'}
                                        </div>
                                        <h1 className='font-semibold text-lg text-gray-200'>{u.email}</h1>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default Project
