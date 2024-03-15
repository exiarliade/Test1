const express = require("express"),
      bodyParser = require('body-parser');
var app = express()

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const initialUser = {
    user_id:'TaroYamada',
    password:'PaSSwd4TY',
    nickname:'Taro',
    comment:"I'm happy."
}

const users = new Map([
    [initialUser.user_id, initialUser],
]); 

const useridFormat = /^([0-9a-zA-Z]){6,20}$/
const passFormat = /^([0-9a-zA-Z\.\,\_\!\@\#\$\%\^\&\*\(\)\+\=\\\[\]\-]){8,20}$/

const unexpectedError = {
    message: "UnexpectedError"
}

const unauthorizedError = {
    message: "Authentication Failed"
}

const noPermissionError = {
    message: "No Permission for Update"
}

const noUserFoundError = {
    message: "No User found"
}

app.post("/signup",function(req,resp){
    try {
        var signUpReq = req.body;
        if (signUpReq.user_id === undefined || signUpReq.password === undefined) {
            resp.status(400);
            resp.send({
                "message": "Account creation failed",
                "cause": "required user_id and password"
            });
            return;
        } else if (!useridFormat.test(signUpReq.user_id)) {
            resp.status(400);
            resp.send({
                "message": "Account creation failed",
                "cause": "incorrect user_id format or length"
            });
            return;
        } else if (!passFormat.test(signUpReq.password)) {
            resp.status(400);
            resp.send({
                "message": "Account creation failed",
                "cause": "incorrect password format or length"
            });
            return;
        } else if (users.has(signUpReq.user_id)) {
            resp.status(400);
            resp.send({
                "message": "Account creation failed",
                "cause": "already same user_id is used"
            });
            return;
        }
        users.set(signUpReq.user_id, {
            user_id: signUpReq.user_id,
            password: signUpReq.password,
            nickname: signUpReq.user_id
        });

        var newUser = users.get(signUpReq.user_id);

        resp.status(200);
        resp.send({
            message: "Account successfully created",
            user: {
              "user_id": newUser.user_id,
              "nickname": newUser.nickname
            }
        });
    } catch (error) {
        resp.status(500);
        resp.send(unexpectedError);  
    }
})

function authorizedUser(req,resp) {
    var auth = req.get('Authorization');
    var hasBasicAuth = auth !== undefined && auth.substring(0, 6) === 'Basic ';
    var base64BasicAuth = hasBasicAuth ? auth.substring(6) : undefined;
    if (!hasBasicAuth) {  
        resp.status(401);
        resp.send(unauthorizedError);
        return false;
    }
    var userPass = Buffer.from(base64BasicAuth, 'base64').toString('ascii').split(':');
    if (!users.has(userPass[0])) {
        resp.status(401);
        resp.send(unauthorizedError);  
        return false;
    }
    var currentUser = users.get(userPass[0]);
    if (base64BasicAuth !== Buffer.from(currentUser.user_id.concat(":", currentUser.password)).toString('base64')) {
        resp.status(401);
        resp.send(unauthorizedError);  
        return false;
    }
    return currentUser;
}

app.get("/users/:user_id",function(req,resp){
    try {
        if (!authorizedUser(req,resp)) {
            return;
        }

        var qUser = users.get(req.params.user_id);
        if (qUser === undefined) {
            resp.status(404);
            resp.send(noUserFoundError);  
            return;
        } 

        var userResp = {
            user_id:qUser.user_id,
            nickname:qUser.nickname !== undefined || qUser.nickname !== '' ? qUser.nickname : qUser.user_id,
        };
        if (qUser.comment !== undefined || qUser.comment !== '') {
            userResp.comment = qUser.comment;
        }
        resp.status(200);
        resp.send({
            message: "User details by user_id",
            user: userResp
        });
    } catch (error) {
        resp.status(500);
        resp.send(unexpectedError);   
    }
})

app.patch("/users/:user_id",function(req,resp){
    try {
        var currentUser = authorizedUser(req,resp);
        if (!currentUser) {
            return;
        }

        if (req.params.user_id !== currentUser.user_id) {
            resp.status(403);
            resp.send(noPermissionError);
            return;
        }

        var qUser = users.get(req.params.user_id);
        if (qUser === undefined) {
            resp.status(404);
            resp.send(noUserFoundError);
            return;
        } 

        var updateReq = req.body;
        if (updateReq.user_id !== undefined || updateReq.password !== undefined) {
            resp.status(400);
            resp.send({
                "message": "User updation failed",
                "cause": "not updatable user_id and password"
                });
            return;
        }
        var hasUpdate = false;
        if (updateReq.nickname !== undefined) {
            hasUpdate = true;
            var newNickname = updateReq.nickname.substring(0, 30).trim();
            if (newNickname === '') {
                qUser.nickname = qUser.user_id;
            } else {
                qUser.nickname = newNickname;
            }
        }
        if (updateReq.comment !== undefined) {
            hasUpdate = true;
            var newComment = updateReq.comment.substring(0, 100).trim();
            if (newComment === '') {
                qUser.comment = undefined;
            } else {
                qUser.comment = newComment;
            }
        }
        if (!hasUpdate) {
            resp.status(400);
            resp.send({
                "message": "User updation failed",
                "cause": "required nickname or comment"
                });
            return;
        }
        users.set(qUser.user_id, qUser);
        resp.status(200);
        resp.send({
            message: "User successfully updated",
            recipe: {
                nickname: qUser.nickname,
                comment: qUser.comment
            }
        });
    } catch (error) {
        resp.status(500);
        resp.send(unexpectedError);   
    }
})

app.post("/close",function(req,resp){
    try {
        var currentUser = authorizedUser(req,resp);
        if (!currentUser) {
            return;
        }
        
        users.delete(currentUser.user_id);
        resp.status(200);
        resp.send({
            "message": "Account and user successfully removed"
        });
    } catch (error) {
        resp.status(500);
        resp.send(unexpectedError);   
    }
})

app.listen(8080, function () {
    console.log("Started application on port %d", 8080)
});