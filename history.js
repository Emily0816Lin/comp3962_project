document.addEventListener('DOMContentLoaded', () => {
    readAllItems();
});

// Fetch all items from the API
// Fetch all items from the API
function readAllItems() {
    fetch('/history/api/items')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('historyTable').getElementsByTagName('tbody')[0];
            tableBody.innerHTML = ''; // Clear current table body

            data.data.forEach(item => {
                const row = document.createElement('tr');
                
                const dateCell = document.createElement('td');
                dateCell.appendChild(document.createTextNode(item.date));
                row.appendChild(dateCell);
                
                const timeCell = document.createElement('td');
                timeCell.appendChild(document.createTextNode(item.time));
                row.appendChild(timeCell);
                
                const statusCell = document.createElement('td');
                const statusSpan = document.createElement('span');
                statusSpan.textContent = item.status;
                statusSpan.className = 'statusStyle'; // Assign a class for styling
                statusCell.appendChild(statusSpan);
                row.appendChild(statusCell);
                
                // Details cell
                const detailsCell = document.createElement('td');
                const viewButton = document.createElement('button');
                viewButton.classList.add('viewButton');
                viewButton.textContent = '🔍 View';
                viewButton.onclick = () => showItemDetails(item); // Set onclick event
                detailsCell.appendChild(viewButton);
                row.appendChild(detailsCell);
                
                tableBody.appendChild(row);
            });

        })
        .catch(error => console.error('Error fetching items:', error));
}


// Show details of a specific item
function showItemDetails(item) {
    document.getElementById('historyTable').style.display = 'none'; // Hide the table
    const detailsList = document.getElementById('detailsList');
    detailsList.style.display = 'block'; // Make the details list visible
    detailsList.className = 'detailsList'; // Apply styles from the CSS class
    detailsList.innerHTML = ''; // Clear current details

    // Add title to the list
    const title = document.createElement('h3');
    title.textContent = 'Appointment Details';
    detailsList.appendChild(title);

    // Function to create a separator
    function createSeparator() {
        const separator = document.createElement('div');
        separator.className = 'separator'; // Apply styles from the CSS class
        return separator;
    }

    // Populate details list with information from the item
    const dateLi = document.createElement('li');
    dateLi.textContent = `Appointment Date: ${item.date}`;
    detailsList.appendChild(dateLi);

    const timeLi = document.createElement('li');
    timeLi.textContent = `Appointment Time: ${item.time}`;
    detailsList.appendChild(timeLi);

    // Add a separator line after time
    detailsList.appendChild(createSeparator());

    const patientLi = document.createElement('li');
    patientLi.textContent = `Patient: ${item.name}`;
    detailsList.appendChild(patientLi);

    const patientEmailLi = document.createElement('li');
    patientEmailLi.textContent = `Contact: ${item.email}`;
    detailsList.appendChild(patientEmailLi);

    // Add a separator line after time
    detailsList.appendChild(createSeparator());

    const doctorLi = document.createElement('li');
    doctorLi.textContent = `Doctor: doctor name here`;
    detailsList.appendChild(doctorLi);
    
    const departmentLi = document.createElement('li');
    departmentLi.textContent = `Department: department name here`;
    detailsList.appendChild(departmentLi);

    const doctorcommentLi = document.createElement('li');
    doctorcommentLi.textContent = `Doctor's Comment: ${item.doctorcomment}`;
    detailsList.appendChild(doctorcommentLi);

    // Add a separator line after time
    detailsList.appendChild(createSeparator());

    const prescriptionLi = document.createElement('li');
    prescriptionLi.textContent = `Prescription: ${item.prescription}`;
    detailsList.appendChild(prescriptionLi);

    // Add a separator line after time
    detailsList.appendChild(createSeparator());
    
    const statusLi = document.createElement('li');
    statusLi.textContent = `Status: ${item.status}`;
    detailsList.appendChild(statusLi);

    // Add a break or space before the Go Back button
    // detailsList.appendChild(document.createElement('br')); // Adds a line break

    // Add a Go Back button
    const goBackButton = document.createElement('button');
    goBackButton.textContent = 'Go Back';
    goBackButton.className = 'goBackButton'; // Apply styles from the CSS class
    goBackButton.onclick = () => {
        document.getElementById('historyTable').style.display = ''; // Show the table again
        detailsList.innerHTML = ''; // Clear the details list
        detailsList.className = ''; // Remove the box style
    };

    detailsList.appendChild(goBackButton);
}