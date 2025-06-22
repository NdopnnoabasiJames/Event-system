## **Implementation Plan:**

### **1. Update Event Schema:**

* Add `volunteerRequests` array with status tracking
* Keep existing [workers](vscode-file://vscode-app/c:/Users/hp/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html) array for approved volunteers only

### **2. Worker Endpoints:**

* **All Events** : Show only [status: &#39;published&#39;](vscode-file://vscode-app/c:/Users/hp/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html) events
* **My Events** : Show events where worker is in [workers[]](vscode-file://vscode-app/c:/Users/hp/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html) array (approved only)
* **Volunteer** : Add to `volunteerRequests` with appropriate status

### **3. Branch Admin Endpoints:**

* View pending volunteer requests for their events
* Approve/reject volunteer requests (moves to [workers[]](vscode-file://vscode-app/c:/Users/hp/AppData/Local/Programs/Microsoft%20VS%20Code/resources/app/out/vs/code/electron-sandbox/workbench/workbench.html) when approved)

### **4. Frontend Updates:**

* Update button logic based on volunteer status
* Handle pending/approved states properly
