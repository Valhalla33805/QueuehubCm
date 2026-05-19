// 🔥 CM QUEUEHUB - CENTRALIZED CLOUD QUEUE SYSTEM v5.2 (Unified F-Prefix Patched)

// 1. Import Firebase Core and Realtime Database Modules dynamically via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 2. Your exact Singapore-hosted Firebase configuration credentials
const firebaseConfig = {
  apiKey: "AIzaSyA__k1o9aqvJdHHCpakUWFgS8nbm2iqB54",
  authDomain: "queuehub-29698.firebaseapp.com",
  databaseURL: "https://queuehub-29698-default-rtdb.asia-southeast1.firebasedatabase.app/", 
  projectId: "queuehub-29698",
  storageBucket: "queuehub-29698.firebasestorage.app",
  messagingSenderId: "995891160219",
  appId: "1:995891160219:web:a58e790190810823ab523e",
  measurementId: "G-872CBRM5FQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const queueRef = ref(db, "cmQueueData");

class QueueHubSystem {
    constructor() {
        this.serviceTimePerPerson = 4;
        this.queue = {
            current: null,
            list: [],
            counter: 0,
            windows: { 1: null, 2: null, 3: null },
            stats: { totalToday: 0 },
            logsHistory: []
        };
    }

    // Connect real-time callback channels across different browsers/devices
    listenToCloudUpdates(callback) {
        onValue(queueRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                if (!data.list) data.list = [];
                if (!data.windows) data.windows = { 1: null, 2: null, 3: null };
                if (!data.stats) data.stats = { totalToday: 0 };
                
                // Parse history structures safely back into local runtime engines
                if (data.logsHistory && !Array.isArray(data.logsHistory)) {
                    data.logsHistory = Object.values(data.logsHistory);
                } else if (!data.logsHistory) {
                    data.logsHistory = [];
                }

                this.queue = data;
            }
            if (callback) callback(this.queue);
        });
    }

    async saveQueueToCloud() {
        try {
            await set(queueRef, this.queue);
        } catch (error) {
            console.error("Cloud Write Synchronization Error:", error);
        }
    }

    async joinQueue(userType = "student", explicitName = null, explicitId = null, explicitPurpose = null, uniqueSessionId = null) {
        try {
            this.queue.counter = this.queue.counter || 0;
            this.queue.counter++;

            // 🌟 Updated to force all numbers to standard "F-000" formatting
            const prefix = "F-";
            const queueNumber = `${prefix}${String(this.queue.counter).padStart(3, "0")}`;

            const studentName = explicitName || localStorage.getItem("studentName") || "Guest User";
            const studentId = explicitId || localStorage.getItem("studentId") || "N/A";
            const selectedService = explicitPurpose || localStorage.getItem("selectedService") || "General Inquiry";

            const currentServingCount = Object.values(this.queue.windows).filter(w => w !== null).length;
            const position = this.queue.list.length + 1 + currentServingCount;
            const estimatedWait = Math.max(1, position * this.serviceTimePerPerson);

            const newQueue = {
                id: Date.now(),
                sessionId: uniqueSessionId || "sess_" + Math.random().toString(36).substr(2, 9),
                number: queueNumber,
                role: userType.charAt(0).toUpperCase() + userType.slice(1),
                purpose: selectedService,
                name: studentName,
                studentName: studentName, 
                studentId: studentId,
                status: "Waiting",
                timeJoined: Date.now(),
                estimatedWait: estimatedWait,
                position: position,
                userId: userType
            };

            if (!this.queue.list) this.queue.list = [];
            this.queue.list.push(newQueue);
            
            this.updateAllEstimatesInsideArray();
            await this.saveQueueToCloud();
            return newQueue;
        } catch (error) {
            console.error("Join Processing Fault:", error);
            throw error;
        }
    }

    updateAllEstimatesInsideArray() {
        const activeServing = Object.values(this.queue.windows).filter(w => w !== null).length;
        if (this.queue.list) {
            this.queue.list.forEach((item, index) => {
                const position = index + 1 + activeServing;
                item.position = position;
                item.estimatedWait = Math.max(1, position * this.serviceTimePerPerson);
            });
        }
    }

    async assignNextToWindow(windowNumber) {
        if (!this.queue.list || this.queue.list.length === 0) {
            throw new Error("No items inside processing stack.");
        }
        if (this.queue.windows[windowNumber]) {
            throw new Error("Target window busy.");
        }

        const nextPerson = this.queue.list.shift();
        nextPerson.status = "Serving";
        nextPerson.startedAt = Date.now();
        nextPerson.windowAssigned = windowNumber;

        this.queue.windows[windowNumber] = nextPerson;
        this.updateAllEstimatesInsideArray();
        await this.saveQueueToCloud();
        return nextPerson;
    }

    async terminateService(windowNumber, resolutionStatus = "Completed") {
        const activeItem = this.queue.windows[windowNumber];
        if (!activeItem) return null;

        const durationInSeconds = Math.round((Date.now() - activeItem.startedAt) / 1000);
        let durationString = `${durationInSeconds}s`;
        if (durationInSeconds >= 60) {
            durationString = `${Math.floor(durationInSeconds / 60)}m ${durationInSeconds % 60}s`;
        }

        const logRecord = {
            date: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
            number: activeItem.number,
            name: activeItem.studentName || activeItem.name || "Guest User",
            userType: activeItem.role || (activeItem.studentId !== "N/A" ? "Student" : "Visitor"),
            purpose: activeItem.purpose || "General Inquiry",
            window: windowNumber,
            timeTaken: durationString,
            status: resolutionStatus,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        if (!this.queue.logsHistory || !Array.isArray(this.queue.logsHistory)) {
            this.queue.logsHistory = [];
        }
        
        this.queue.logsHistory.unshift(logRecord);

        if (resolutionStatus === "Completed") {
            this.queue.stats.totalToday = (this.queue.stats.totalToday || 0) + 1;
        }

        this.queue.windows[windowNumber] = null;
        this.updateAllEstimatesInsideArray();
        
        await this.saveQueueToCloud();
        return logRecord;
    }

    async leaveQueue(uniqueSessionId) {
        if (this.queue.list) {
            this.queue.list = this.queue.list.filter(q => q.sessionId !== uniqueSessionId);
        }
        for (let i = 1; i <= 3; i++) {
            if (this.queue.windows[i] && this.queue.windows[i].sessionId === uniqueSessionId) {
                this.queue.windows[i] = null;
            }
        }
        this.updateAllEstimatesInsideArray();
        await this.saveQueueToCloud();
    }
}

window.sysBackend = new QueueHubSystem();