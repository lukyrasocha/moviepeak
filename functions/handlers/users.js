const { admin, db } = require('../util/admin');

const config = require('../util/config');

const axios = require('axios')
const firebase = require('firebase');
firebase.initializeApp(config);

const { validateSignupData, validateLoginData, reduceUserDetails } = require('../util/validators');
const { UserRecordMetadata } = require('firebase-functions/lib/providers/auth');
const { url } = require('inspector');

exports.signup = (req,res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle

    };

    const { valid,errors } = validateSignupData(newUser);

    if(!valid) return res.status(400).json(errors);

    const noImg = 'no-img.png'

    let token,userId;
    db.doc(`/users/${newUser.handle}`).get()
        .then(doc => {
            if(doc.exists){
                return res.status(400).json({handle: 'this handle is already taken'})
            } else {
                return firebase
                .auth()
                .createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
        })
        .then(data => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then(idToken => {
            token = idToken;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
                userId: userId,
                topMovies: []
            };
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })
        .then(() => {
            return res.status(201).json({ token });

        })
        .catch(err => {
            console.error(err);
            if(err.code === 'auth/email-already-in-use'){
                res.status(400).json({email: 'Email is already used'});
            } else{
                return res.status(500).json({ general: 'Something went wrong, please try again'});
            }
            
        });
};

// Log user in

exports.login = (req,res) => {
    const user ={
        email: req.body.email,
        password: req.body.password
    };

    const { valid,errors } = validateLoginData(user);

    if(!valid) return res.status(400).json(errors);

    firebase.auth().signInWithEmailAndPassword(user.email,user.password)
        .then(data => {
            return data.user.getIdToken();

        })
        .then(token => {
            return res.json({token});
        })
        .catch(err => {
            console.error(err);
            return res.status(403).json({general: 'Wrong credentials'});

        });

};


// Add user details

exports.addUserDetails = (req,res) => {
    let userDetails = reduceUserDetails(req.body);
    
    db.doc(`/users/${req.user.handle}`).update(userDetails)
        .then(() => {
            return res.json({ message: 'Details added successfully' });
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code });
        })
}
//Get any users details
exports.getUserDetails = (req,res) => {
    let userData = {};
    db.doc(`/users/${req.params.handle}`).get()
        .then(doc => {
            if(doc.exists){
                userData.user = doc.data();
                return db.collection('screams').where('userHandle','==', req.params.handle)
                    .orderBy('createdAt', 'desc')
                    .get()
            } else{
                return res.status(404).json({error: 'User not found'})
            }
        })
        .then(data => {
            userData.screams = [];
            data.forEach(doc => {
                userData.screams.push({
                    body: doc.data().body,
                    createdAt: doc.data().createdAt,
                    userHandle: doc.data().userHandle,
                    userImage: doc.data().userImage,
                    likeCount: doc.data().likeCount,
                    commentCount: doc.data().commentCount,
                    screamId: doc.id
                })
            });
            return res.json(userData)
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({error: err.code})
        })
}
//Get own user details
exports.getAuthenticatedUser = (req,res) => {
    let userData = {};
    db.doc(`/users/${req.user.handle}`).get()
        .then(doc => {
            if(doc.exists){
                userData.credentials = doc.data();
                return db.collection('likes').where('userHandle', '==', req.user.handle).get()
            }
        })
        .then(data => {
            userData.likes = [];
            data.forEach(doc => {
                userData.likes.push(doc.data());
            });
            return db.collection('notifications').where('recipient','==', req.user.handle)
                .orderBy('createdAt','desc').limit(10).get();
        })
        .then(data => {
            userData.notifications = [];
            data.forEach(doc => {
                userData.notifications.push({
                    recipient: doc.data().recipient,
                    sender: doc.data().sender,
                    createdAt: doc.data().createdAt,
                    screamId: doc.data().screamId,
                    type: doc.data().type,
                    read: doc.data().read,
                    notificationId: doc.id

                })
            });
            return res.json(userData)
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code});
        });
}

// Upload a profile image for user

exports.uploadImage = (req,res) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const busboy = new BusBoy({ headers: req.headers});

    let imageFileName;
    let imageToBeUploaded = {};

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        console.log(mimetype)
        if(mimetype !== 'image/jpeg' && mimetype !== 'image/png'){
            return res.status(400).json({ error: 'Wrong file type submitted' });
        }

        const imageExtension = filename.split('.')[filename.split('.').length - 1]; //access the last item(for example 'png')
        imageFileName = `${Math.round(Math.random()*100000000000)}.${imageExtension}`;

        const filepath = path.join(os.tmpdir(), imageFileName);
        imageToBeUploaded = { filepath, mimetype };
        file.pipe(fs.createWriteStream(filepath));

    });
    busboy.on('finish', () => {
        admin.storage().bucket().upload(imageToBeUploaded.filepath, {
            resumable: false,
            metadata: {
                metadata: {
                    contentType: imageToBeUploaded.mimetype
                }
            }
        })
        .then(() => {
            const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
            return db.doc(`/users/${req.user.handle}`).update({ imageUrl: imageUrl});
        })
        .then(() => {
            return res.json({ message: 'Image uploaded successfully'});
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code });
        })
    });
    busboy.end(req.rawBody);
};

exports.markNotificationsRead = (req,res) => {
    let batch = db.batch();
    req.body.forEach(notificationId => {
        const notification = db.doc(`/notifications/${notificationId}`);
        batch.update(notification, {read: true});
    });
    batch.commit()
        .then(() => {
            return res.json({message: 'Notifications marked read'});
        })
        .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code});
        });
};

// Add a movie to user's personal top list
exports.addMovie = (req,res) => {
    
    const options = 
        {
        method: 'GET',
        url: `https://www.omdbapi.com/?apikey=87ee8bc&t=${req.body.title}&y=${req.body.year}`,
        };

    let movies = {};
    movies.topMovies = req.user.topMovies;
    let movie = {}
    let isThere = false;

    axios.request(options).then(function (response) {
        movies.topMovies.forEach(movie => {
            if(movie.id === response.data.imdbID){
                isThere = true; 
            };
        });
        
        if(isThere === true){
            return res.status(400).json({error: 'Movie already added'});
        }

        if(movies.topMovies.length === 5){
            return res.status(400).json({error: 'Maximum amount reached'});
        }

        movie.title = response.data.Title;
        movie.year = response.data.Year;
        movie.rating = response.data.imdbRating;
        movie.imgUrl = response.data.Poster;
        movie.id = response.data.imdbID;

        movies.topMovies.push(movie);
        db.doc(`/users/${req.user.handle}`).update(movies);
        return res.status(200).json(response.data)
    
    })
    .catch(function (error) {
        console.error(error);
    });
    
}

