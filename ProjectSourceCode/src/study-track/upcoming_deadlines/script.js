// Replace this with your actual backend endpoint.
//const API_URL = "https://your-canvas-api-url.com/api/deadlines"; // Replace with your actual Canvas API URL
//The function: querySelector is used to select the first element that matches a specified CSS selector.
const rows = document.querySelector("#deadlineRows"); //DEADLINE ROWS 
const tableContainer = document.querySelector("#tableContainer"); //table container for deadlines
const status = document.querySelector("#status");
const errorMessage = document.querySelector("#errorMessage"); //error message container
const summary = document.querySelector("#summary");
const rangeFilter = document.querySelector("#rangeFilter");
const refreshButton = document.querySelector("#refreshButton"); //the refresh button for reloading deadlines


function getTimeRemaining(milliseconds) {
  const minutes = Math.ceil(milliseconds / 60000);

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} left`;
  }
// Calculate the hours 
  const hours = Math.ceil(milliseconds / 3600000);

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} left`;
  }
  const days = Math.ceil(milliseconds / 86400000);

  return `${days} day${days === 1 ? "" : "s"} left`;
}

