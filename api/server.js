// See https://github.com/typicode/json-server#module
const jsonServer = require('json-server');
const fs = require('fs');

const server = jsonServer.create();
// const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
// const cors = require('cors');
const { omit } = require('ramda');
// const corsOptions = {
// 	origin: '*',
// 	credentials: true, //access-control-allow-credentials:true
// 	optionSuccessStatus: 200,
// };

const router = jsonServer.router('./db.json');

// server.use(bodyParser.urlencoded({ extended: true }));
// server.use(bodyParser.json());

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

const middlewares = jsonServer.defaults();
// Register New User
server.post('/register', (req, res) => {
	const { email, password, firstname, lastname } = req.body;
	const data = JSON.parse(fs.readFileSync('./db.json', 'UTF-8'));
	const targetUser = data.users.find((user) => user.email === email);

	if (targetUser) {
		const status = 401;
		const message = 'Email and Password already exist';
		res.status(status).json(message);
		return;
	}

	// Get the id of last user
	var last_item_id = data.users[data.users.length - 1].id;

	//Add new user
	data.users.push({
		id: last_item_id + 1,
		email,
		password,
		firstname,
		lastname,
	}); //add some data
	fs.writeFile('./db.json', JSON.stringify(data), (err, result) => {
		// WRITE
		if (err) {
			const status = 401;
			const message = err;
			res.status(status).json(err);
			return;
		}
	});

	// Create token for new user
	const accessToken = createToken({ email, password });
	const newUser = data.users.find((user) => user.email === email);
	res.status(201).json({
		accessToken,
		user: omit(['password'], newUser),
	});
});

// Login to one of the users from ./db.json
server.post('/login', (req, res) => {
	const { email, password } = req.body;

	const userdb = JSON.parse(fs.readFileSync('./db.json', 'UTF-8'));
	const newUser = userdb.users.find((user) => user.email === email);

	if (!newUser) {
		const status = 401;
		const message = 'Incorrect email or password';
		res.status(status).json({ status, message });
		return;
	}

	const accessToken = createToken({ email, password });
	res.status(200).json({
		accessToken,
		user: omit(['password'], newUser),
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

server.use(jsonServer.bodyParser);
server.use(
	jsonServer.defaults({
		noCors: true,
	})
);

// Add this before server.use(router)
server.use(
	jsonServer.rewriter({
		'/api/*': '/$1',
	})
);
// server.use(cors(corsOptions));
server.use(router);
server.listen(4000, () => {
	console.log('JSON Server is running');
});

// Export the Server API
module.exports = server;
