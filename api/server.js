// See https://github.com/typicode/json-server#module
const jsonServer = require('json-server');
const fs = require('fs');

const server = jsonServer.create();
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const corsOptions = {
	origin: '*',
	credentials: true, //access-control-allow-credentials:true
	optionSuccessStatus: 200,
};

const router = jsonServer.router('./db.json');
const userdb = JSON.parse(fs.readFileSync('./db.json', 'UTF-8'));

server.use(bodyParser.urlencoded({ extended: true }));
server.use(bodyParser.json());
server.use(jsonServer.defaults());

const SECRET_KEY = '123456789';

const expiresIn = '1h';

// Create a token from a payload
function createToken(payload) {
	return jwt.sign(payload, SECRET_KEY, { expiresIn });
}

// Verify the token
function verifyToken(token) {
	return jwt.verify(token, SECRET_KEY, (err, decode) =>
		decode !== undefined ? decode : err
	);
}

// Check if the user exists in database
function isAuthenticated({ email, password }) {
	return (
		userdb.users.findIndex(
			(user) => user.email === email && user.password === password
		) !== -1
	);
}
// Uncomment to allow write operations
// const fs = require('fs')
// const path = require('path')
// const filePath = path.join('db.json')
// const data = fs.readFileSync(filePath, "utf-8");
// const db = JSON.parse(data);
// const router = jsonServer.router(db)

const middlewares = jsonServer.defaults();
// Register New User
server.post('/register', (req, res) => {
	const { email, password } = req.body;

	if (isAuthenticated({ email, password }) === true) {
		const status = 401;
		const message = 'Email and Password already exist';
		res.status(status).json({ status, message });
		return;
	}

	fs.readFile('./db.json', (err, data) => {
		if (err) {
			const status = 401;
			const message = err;
			res.status(status).json({ status, message });
			return;
		}

		// Get current users data
		var data = JSON.parse(data.toString());

		// Get the id of last user
		var last_item_id = data.users[data.users.length - 1].id;

		//Add new user
		data.users.push({
			id: last_item_id + 1,
			email: email,
			password: password,
		}); //add some data
		var writeData = fs.writeFile(
			'./db.json',
			JSON.stringify(data),
			(err, result) => {
				// WRITE
				if (err) {
					const status = 401;
					const message = err;
					res.status(status).json({ status, message });
					return;
				}
			}
		);
	});

	// Create token for new user
	const accessToken = createToken({ email, password });
	res.status(200).json({
		accessToken,
		user: {
			email,
			id: 1,
		},
	});
});

// Login to one of the users from ./db.json
server.post('/login', (req, res) => {
	const { email, password } = req.body;
	if (isAuthenticated({ email, password }) === false) {
		const status = 401;
		const message = 'Incorrect email or password';
		res.status(status).json({ status, message });
		return;
	}

	const accessToken = createToken({ email, password });
	res.status(200).json({
		accessToken,
		user: {
			email,
			id: 1,
		},
	});
});

// server.use(/^(?!\/auth).*$/,  (req, res, next) => {
//   if (req.headers.authorization === undefined || req.headers.authorization.split(' ')[0] !== 'Bearer') {
//     const status = 401
//     const message = 'Error in authorization format'
//     res.status(status).json({status, message})
//     return
//   }
//   try {
//     let verifyTokenResult;
//      verifyTokenResult = verifyToken(req.headers.authorization.split(' ')[1]);

//      if (verifyTokenResult instanceof Error) {
//        const status = 401
//        const message = 'Access token not provided'
//        res.status(status).json({status, message})
//        return
//      }
//      next()
//   } catch (err) {
//     const status = 401
//     const message = 'Error access_token is revoked'
//     res.status(status).json({status, message})
//   }
// })
server.use(middlewares);
// Add this before server.use(router)
server.use(
	jsonServer.rewriter({
		'/api/*': '/$1',
	})
);
server.use(cors(corsOptions));
server.use(router);
server.listen(4000, () => {
	console.log('JSON Server is running');
});

// Export the Server API
module.exports = server;
