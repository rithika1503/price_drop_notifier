// Import Firebase SDK (compat version for background scripts)
// Import the functions you need from the SDKs you need
// Example (files must be inside your extension directory)
importScripts('vendor/firebase-app-compat.js');
importScripts('vendor/firebase-auth-compat.js');
// Never use CDN or external URLs!





// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {

  apiKey: "------",
  projectId: "price-drop-notifier-bf271",
  storageBucket: "price-drop-notifier-bf271.firebasestorage.app",
  messagingSenderId: "905401518742",
  appId: "1:905401518742:web:0d035521f6c0c3635e90b7",
  measurementId: "G-CFVN6DK0X0"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
// Do NOT use analytics here.

//njno

// Firebase config


chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'Login' || msg.type === 'Register') {
        const email = msg.email;
        const password = msg.password;

        if (msg.type === 'Login') {
            auth.signInWithEmailAndPassword(email, password)
                .then(() => {
                    chrome.action.setPopup({ popup: "home.html" });
                    chrome.notifications.create({
                        type: "basic",
                        iconUrl: "icon.png",
                        title: "Login Success",
                        message: "You are logged in!"
                    });
                    chrome.storage.local.set({ userEmail: email });
                })
                .catch(() => {
                    chrome.notifications.create({
                        type: "basic",
                        iconUrl: "icon.png",
                        title: "Login Failed",
                        message: "Wrong email or password."
                    });
                });
        } else if (msg.type === 'Register') {
            auth.createUserWithEmailAndPassword(email, password)
                .then(() => {
                    chrome.notifications.create({
                        type: "basic",
                        iconUrl: "icon.png",
                        title: "Registration Successful",
                        message: "Registered! Please log in."
                    });
                });
        }
    }

    else if (msg.type === 'logOut') {
        auth.signOut().then(() => {
            chrome.action.setPopup({ popup: "popup.html" });
            chrome.notifications.create({
                type: "basic",
                iconUrl: "icon.png",
                title: "Logged Out",
                message: "You have been logged out."
            });
        });
    }

    else if (msg.type === 'addProduct') {
        const prodUrl = msg.prodUrl;
        const price = msg.price;

        chrome.storage.local.get('userEmail', (result) => {
            fetch("http://localhost:3000/products", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    prodUrl: prodUrl,
                    price: price,
                    email: result.userEmail
                })
            })
            .then(response => response.text())
            .then(data => {
                console.log("Server response:", data);
                chrome.notifications.create({
                    type: "basic",
                    iconUrl: "icon.png",
                    title: "Tracking Started",
                    message: "You'll be notified when the price drops!"
                });
            })
            .catch(error => {
                console.error("Error sending data:", error);
                chrome.notifications.create({
                    type: "basic",
                    iconUrl: "icon.png",
                    title: "Error",
                    message: "Could not connect to the price tracker server."
                });
            });
        });
    }
});

