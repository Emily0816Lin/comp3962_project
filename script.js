document.addEventListener("DOMContentLoaded", function() {
    // Function to fetch available slots for the selected date
    function fetchAvailableSlots(selectedDate) {
        const formattedDate = selectedDate.split('-').reverse().join('-');
console.log("Formatted date:", formattedDate);
        fetch(`/slots?date=${formattedDate}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(slots => {
                if (slots.length === 0) {
                    showNoSlotsMessage();
                    return;
                }
                populateTimeSlots(slots);
            })
            .catch(error => {
                console.error("Error fetching available slots:", error.message);
            });
    }

    function showNoSlotsMessage() {
        var timeSlotsContainer = document.getElementById("time-slots");
        timeSlotsContainer.innerHTML = "<p>No slots available for selected date</p>";
    }
    // Function to populate available time slots in the HTML form
    function populateTimeSlots(slots) {
        var timeSlotsContainer = document.getElementById("time-slots");
        timeSlotsContainer.innerHTML = ""; // Clear existing slots

        slots.forEach(function(slot) {
            if(slot.Available === "yes"){
            var slotDiv = document.createElement("div");
            slotDiv.classList.add("form-group");
            var timeLabel = document.createElement("label");
            timeLabel.textContent = slot.time;
            slotDiv.appendChild(timeLabel);
            var radioInput = document.createElement("input");
            radioInput.type = "radio";
            radioInput.id = slot.time; // Assuming time is unique
            radioInput.name = "time";
            radioInput.value = slot.time;
            slotDiv.appendChild(radioInput);
            timeSlotsContainer.appendChild(slotDiv);
            }
        });
    }

    // Event listener for date select input change
    document.getElementById("date").addEventListener("change", function() {
        var selectedDate = this.value;
        console.log("Selected date:", selectedDate);
        
            fetchAvailableSlots(selectedDate);
        
    });
});
