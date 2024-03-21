require("dotenv").config();
const express = require('express');
var AWS = require("aws-sdk");
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const app = express();
const { CognitoIdentityServiceProvider } = require('aws-sdk'); // Import CognitoIdentityServiceProvider from AWS SDK
const port = process.env.PORT || 3000;


app.use(bodyParser.json());

let awsConfig = {
    "region": "us-west-2",
    "accessKeyId": process.env.ACCESS_KEY_ID,
    "secretAccessKey": process.env.SECRET_ACCESS_KEY
};
    

AWS.config.update(awsConfig);
let docClient = new AWS.DynamoDB.DocumentClient();

// Create a new SES object
const ses = new AWS.SES({ apiVersion: "2010-12-01" });

// Create a new CognitoIdentityServiceProvider object
const cognito = new AWS.CognitoIdentityServiceProvider();

// var params = {
//     TableName: "appointment",
    
// };

app.use(express.static(__dirname));

// DynamoDB Operations: Read all Items for history page
const readAllItems = async () => {
    const params = {
        TableName: "patient"
    };

    try {
        const { Items = [] } = await docClient.scan(params).promise();
        return { success: true, data: Items };
    } catch (error) {
        return { success: false, data: null };
    }
};

// Update Items
const updateItem = async (data = {}) => {
    console.log('data:', data);
    console.log('item name:', data.name);
    console.log('item email:', data.email);

    const params = {
        TableName: 'patient',
        Key: {
            name: data.name,
            email: data.email
        },
        UpdateExpression: 'SET #doctorcomment = :newDoctorComment, #prescription = :newPrescription, #status = :newStatus',
        ExpressionAttributeNames: {
            '#doctorcomment': 'doctorcomment',
            '#prescription': 'prescription',
            '#status': 'status'
        },
        ExpressionAttributeValues: {
            ':newDoctorComment': data.doctorcomment,
            ':newPrescription': data.prescription,
            ':newStatus': data.status
        }
    };

    try {
        const response = await docClient.update(params).promise();
        return { success: true, item: response.Attributes }; // Return the updated attributes
    } catch (error) {
        console.error("Error updating item:", error);
        return { success: false, data: null };
    }
};

// Read all Items
app.get("/history/api/items", async (req, res) => {
    const { success, data } = await readAllItems();

    if (success) {
        return res.json({ success, data });
    }
    return res.status(500).json({ success: false, message: "Error" });
});

// Update Item
app.post("/history/api/item", async (req, res) => {
    console.log("Received request:", req.body);  // Log the incoming request body

    const { success, data } = await updateItem(req.body);

    if (success) {
        return res.json({ success, data });
    }
    return res.status(500).json({ success: false, message: 'Error' });
});

app.get('/slots', (req, res) => {
    const date = req.query.date;
    const params = {
        TableName: "appointment",
    };

    // Check if date is provided as query parameter
    if (!date) {
        return res.status(400).json({ error: 'Date parameter is required' });
    }

    docClient.scan(params, (err, data) => {
        if (err) {
            console.error('Unable to read items. Error JSON:', JSON.stringify(err, null, 2));
            res.status(500).send('Internal Server Error');
        } else {
            console.log('Data received from database:', data);
            
            // Filter the data based on the provided date
            const filteredItems = data.Items.filter(item => item.date === date);
            console.log('Filtered items:', filteredItems);
            
            res.json(filteredItems);
        }
    });
});


app.get('/', (req, res) => {
    res.sendFile(__dirname + '/main.html');
});

// Sign-up endpoint
app.post('/signup', async (req, res) => {
    const { name, password, email } = req.body;

    const params = {
        ClientId: process.env.COGNITO_CLIENT_ID, // Your Cognito app client ID
        Username: email,
        Password: password,
        UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'name', Value: name }
            // Add any additional attributes if required
        ]
    };

    try {
        // Sign up the user
        const data = await cognito.signUp(params).promise();

        console.log('User signed up successfully:', data);

        // Redirect the user to the home.html page
        res.redirect('/verification.html');
    } catch (error) {
        console.error('Error signing up user:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});


app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const params = {
        AuthFlow: 'USER_PASSWORD_AUTH', // Specify the authentication flow
        ClientId: process.env.COGNITO_CLIENT_ID, // Your Cognito app client ID
        AuthParameters: {
            'USERNAME': email,
            'PASSWORD': password
        }
    };

    try {
        // Authenticate the user
        const data = await cognito.initiateAuth(params).promise();

        console.log('User authenticated successfully:', data);

        // Redirect the user to the home.html page
        res.redirect('/home.html');
    } catch (error) {
        console.error('Error authenticating user:', error);
        res.status(401).json({ success: false, error: 'Unauthorized' });
    }
});


// Verification endpoint
app.post('/verify', async (req, res) => {
    const { email, verificationCode } = req.body;

    const params = {
        ClientId: process.env.COGNITO_CLIENT_ID, // Your Cognito app client ID
        Username: email,
        ConfirmationCode: verificationCode
    };

    try {
        // Confirm user's email address
        await cognito.confirmSignUp(params).promise();

        console.log('User email confirmed successfully');

        res.json({ success: true, message: 'Email confirmed successfully. You can now log in.' });

    
    } catch (error) {
        console.error('Error confirming email:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.post('/bookAppointment', async (req, res) => {
    const { name, email, date, time } = req.body;

    if (!name || !email || !date || !time) {
        return res.status(400).json({ error: 'Name, email, date, and time are required' });
    }

    const params = {
        TableName: 'patient',
        Item: {
            name: name,
            email: email,
            date: date,
            doctorcomment: "", // Empty string for doctor comment
            prescription: "", // Empty string for prescription
            status: "coming", // Default status
            time: time
        }
    };

    try {
        await docClient.put(params).promise();

        console.log('Added appointment to DynamoDB');

        // Update the availability of the selected time slot
        const updateParams = {
            TableName: 'appointment',
            Key: {
                date: date,
                time: time
            },
            UpdateExpression: 'SET #available = :newValue',
            ExpressionAttributeNames: {
                '#available': 'Available'
            },
            ExpressionAttributeValues: {
                ':newValue': 'no'
            }
        };

        await docClient.update(updateParams).promise();

        console.log('Time slot availability updated');

        // Send email notification
        const emailParams = {
            Destination: {
                ToAddresses: [email] // recipient email address
            },
            Message: {
                Body: {
                    Text: {
                        Data: `Hello ${name}, your appointment for ${date} at ${time} has been booked successfully.`
                    }
                },
                Subject: {
                    Data: 'Appointment Confirmation'
                }
            },
            Source: 'eschedulerapp@gmail.com' // sender email address
        };

        await ses.sendEmail(emailParams).promise();

        console.log('Email notification sent');

        res.json({ success: true });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});