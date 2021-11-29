let db = {
    users:[
    {
        userId: 'dhah22332ldasldla',
        email: 'user@email.com',
        handle: 'user',
        createdAt: '2021-02-15T10:59:52.798Z',
        imageUrl: 'image/dsdsadsdasd/dfdgfdgfg',
        bio: 'Hello, my name is user',
        website: 'https://user.com',
        location: 'London, UK',
        topMovies: [
            {
                title: "Spider-Man",
                picture: "img.com"
            },
            {
                title: "Iron-Man",
                picture: "img2.com"
            },
        ]
    }
],


    screams:[
        {
            userHandle: 'user',
            body: 'this is the scream body',
            createdAt: '2021-07-07T16:30:04.121Z' ,
            likeCount: 5,
            commentCount: 3
        }
    ],

    comments: [
        {
            userHandle: 'user',
            screamId: 'ksdaksdkaksdasd',
            body: 'nice one mate',
            createdAt: '2019-03-15T10:52:59.43242'
        }
    ],
    notifications: [
        {
            recipient: 'user',
            sender: 'john',
            read: 'true | false',
            screamId: 'skdaksdkasdkfad',
            type: 'like | comment',
            createdAt: '2019-03-15T10334'
        }
    ]
};

const userDetails = {
    //Redux data
    credentials: {
        userId: "DADSDASDG%£%353535DS",
        email: "user@gmail.com",
        handle: "user",
        createdAt: '2019-03-15T10:59:52.798Z',
        imageUrl: "image/dsfafdsfdaf/sadasdasd",
        bio: "Hello my name is user, nice to meet you",
        website: "https://user.com",
        location: "London, UK"
    },
    likes:[
        {
            userHandle: 'user',
            screamId: 'hat353a5sda',
        },
        {
            userHandle: 'user',
            screamId: '3IOnFoQexdsdasd'
        }
    ]
}
