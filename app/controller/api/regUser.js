const _ = require('lodash');
const xss = require("xss");
const shortid = require('shortid');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const {
    cache,
    siteFunc,
    validatorUtil
} = require('../../utils');

let RegUserController = {

    checkUserFormData(ctx, fields) {
        let errMsg = '';
        // console.log('----')
        if (fields._id && !checkCurrentId(fields._id)) {
            errMsg = ctx.__("validate_error_params");
        }
        if (fields.profession && !validator.isNumeric(fields.profession)) {
            errMsg = ctx.__("validate_error_field", [ctx.__("label_profession")]);
        }
        if (fields.industry && !validator.isNumeric(fields.industry)) {
            errMsg = ctx.__("validate_error_field", [ctx.__("label_introduction")]);
        }
        if (fields.experience && !validator.isNumeric(fields.experience)) {
            errMsg = ctx.__("validate_error_field", [ctx.__("label_experience")]);
        }
        if (fields.userName && !validatorUtil.isRegularCharacter(fields.userName)) {
            errMsg = ctx.__("validate_error_field", [ctx.__("label_user_userName")]);
        }
        if (fields.userName && !validator.isLength(fields.userName, 2, 30)) {
            errMsg = ctx.__("validate_rangelength", [ctx.__("label_user_userName"), 2, 12]);
        }
        if (fields.name && !validatorUtil.isRegularCharacter(fields.name)) {
            errMsg = ctx.__("validate_error_field", [ctx.__("label_name")]);
        }
        if (fields.name && !validator.isLength(fields.name, 2, 20)) {
            errMsg = ctx.__("validate_rangelength", [ctx.__("label_name"), 2, 20]);
        }

        if (fields.gender && (fields.gender != '0' && fields.gender != '1')) {
            errMsg = ctx.__("validate_inputCorrect", [ctx.__("lc_gender")]);
        }
        if (fields.email && !validatorUtil.checkEmail(fields.email)) {
            errMsg = ctx.__("validate_inputCorrect", [ctx.__("label_user_email")]);
        }

        if (fields.introduction && !validatorUtil.isRegularCharacter(fields.introduction)) {
            errMsg = ctx.__("validate_error_field", [ctx.__("label_introduction")]);
        }
        if (fields.introduction && !validator.isLength(fields.introduction, 2, 100)) {
            errMsg = ctx.__("validate_rangelength", [ctx.__("label_introduction"), 2, 100]);
        }
        if (fields.comments && !validatorUtil.isRegularCharacter(fields.comments)) {
            errMsg = ctx.__("validate_error_field", [ctx.__("label_comments")]);
        }
        if (fields.comments && !validator.isLength(fields.comments, 2, 100)) {
            errMsg = ctx.__("validate_rangelength", [ctx.__("label_comments"), 2, 100]);
        }
        if (errMsg) {
            throw new Error(errMsg);
        }
    },


    renderUserList(ctx, userInfo = {}, userList = [], useClient = '2', params = {}) {

        return new Promise(async (resolve, reject) => {
            try {

                let newUserList = JSON.parse(JSON.stringify(userList));
                for (let userItem of newUserList) {

                    let userContents = await ctx.service.content.find({
                        isPaging: '0'
                    }, {
                        query: {
                            uAuthor: userItem._id,
                            state: '2'
                        },
                        files: '_id'
                    })
                    userItem.content_num = userContents.length;
                    userItem.watch_num = _.uniq(userItem.watchers).length;
                    userItem.follow_num = _.uniq(userItem.followers).length;
                    userItem.had_followed = false;

                    // 参与的评论数
                    let comments_num = await ctx.service.message.count({
                        author: userItem._id
                    });
                    userItem.comments_num = comments_num;

                    // 收藏的文章数量
                    userItem.favorites_num = userItem.favorites ? userItem.favorites.length : 0;

                    // 只有查询单个用户才查询点赞总数和被关注人数
                    if (params.apiName == 'getUserInfoById') {
                        let total_likeNum = 0,
                            total_despiseNum = 0;
                        for (const contentItem of userContents) {
                            total_likeNum += await ctx.service.user.count({
                                praiseContents: contentItem._id
                            });
                            total_despiseNum += await ctx.service.user.count({
                                despises: contentItem._id
                            });
                        }
                        userItem.total_likeNum = total_likeNum;
                        userItem.total_despiseNum = total_despiseNum;
                    }

                    if (!_.isEmpty(userInfo)) {
                        if (userInfo.watchers.indexOf(userItem._id) >= 0) {
                            userItem.had_followed = true;
                        }
                    }

                    siteFunc.clearUserSensitiveInformation(userItem);

                }

                resolve(newUserList);
            } catch (error) {
                resolve(userList);
            }
        })

    },

    async updateUser(ctx, app) {


        try {

            let fields = ctx.request.body;

            this.checkUserFormData(ctx, fields);

            const userObj = {};

            if (fields.enable != 'undefined' && fields.enable != undefined) {
                userObj.enable = fields.enable;
            }

            if (fields.phoneNum && validatorUtil.checkPhoneNum((fields.phoneNum).toString())) {
                userObj.phoneNum = fields.phoneNum;
            }

            if (fields.userName) {
                userObj.userName = fields.userName;
            }
            if (fields.name) {
                userObj.name = fields.name;
            }
            if (fields.gender) {
                userObj.gender = fields.gender;
            }

            if (fields.logo) {
                userObj.logo = fields.logo;
            }

            if (fields.confirm) {
                userObj.confirm = fields.confirm;
            }
            if (fields.group) {
                userObj.group = fields.group;
            }
            if (fields.category) {
                userObj.category = fields.category;
            }
            if (fields.comments) {
                userObj.comments = xss(fields.comments);
            }
            if (fields.introduction) {
                userObj.introduction = xss(fields.introduction);
            }
            if (fields.company) {
                userObj.company = fields.company;
            }
            if (fields.province) {
                userObj.province = fields.province;
            }
            if (fields.city) {
                userObj.city = fields.city;
            }
            if (fields.birth) {
                // 生日日期不能大于当前时间
                if (new Date(fields.birth).getTime() > new Date().getTime()) {
                    throw new Error(ctx.__('validate_error_params'));
                }
                userObj.birth = fields.birth;
            }
            if (fields.industry) {
                userObj.industry = xss(fields.industry);
            }
            if (fields.profession) {
                userObj.profession = xss(fields.profession);
            }
            if (fields.experience) {
                userObj.experience = xss(fields.experience);
            }
            if (fields.password) {
                userObj.password = ctx.helper.encrypt(fields.password, app.config.encrypt_key);
            }

            let targetUserId = ctx.session.user._id;

            await ctx.service.user.update(ctx, targetUserId, userObj);

            ctx.helper.renderSuccess(ctx);

        } catch (err) {

            ctx.helper.renderFail(ctx, {
                message: err
            });

        }


    },


    // 我关注的专题、作者等信息
    async getMyFollowInfos(ctx, app) {

        try {
            let userInfo = ctx.session.user;

            let targetUser = await ctx.service.user.item(ctx, {
                query: {
                    _id: userInfo._id
                },
                files: 'watchers',
                populate: [{
                    path: 'watchers',
                    select: 'name userName _id logo'
                }]
            })
            // console.log('-targetUser----', targetUser)
            let watchersList = targetUser.watchers;

            let watchCreatorContents = [];
            for (const creator of watchersList) {
                let creatorId = creator._id;

                let creatorContents = await ctx.service.content.find({
                    isPaging: '0'
                }, {
                    query: {
                        uAuthor: creatorId,
                        state: '2'
                    },
                    files: getContentListFields(true),
                    populate: [{
                        path: 'uAuthor',
                        select: '_id userName logo name group'
                    }]
                });
                if (!_.isEmpty(creatorContents)) {
                    watchCreatorContents = [].concat(creatorContents);
                }
            }

            let renderData = {
                watchersList,
                watchCreatorContents
            }

            ctx.helper.renderSuccess(ctx, {
                data: renderData
            });

        } catch (err) {
            ctx.helper.renderFail(ctx, {
                message: err
            });
        }
    },

    async getUserInfoBySession(ctx, app) {

        try {
            let userId = ctx.session.user._id;
            let targetUser = await ctx.service.user.item(ctx, {
                query: {
                    _id: userId
                },
                files: getAuthUserFields('session')
            });
            ctx.helper.renderSuccess(ctx, {
                data: targetUser
            });
        } catch (err) {
            ctx.helper.renderFail(ctx, {
                message: err
            });
        }

    },

    async getUserInfoById(ctx, app) {

        try {
            let targetId = ctx.query.id;
            let user = ctx.session.user || {};

            if (!shortid.isValid(targetId)) {
                throw new Error(ctx.__("validate_error_params"));
            }

            let targetUser = await ctx.service.user.item(ctx, targetId, {
                files: getAuthUserFields('base')
            });
            let userArr = [].push(targetUser);
            let renderUser = await this.renderUserList(ctx, user, userArr, '2', {
                apiName: 'getUserInfoById'
            });
            let userInfo = {};
            if (!_.isEmpty(renderUser) && (renderUser.length == 1)) {
                userInfo = renderUser[0];
            }

            ctx.helper.renderSuccess(ctx, {
                data: userInfo
            });

        } catch (err) {
            ctx.helper.renderFail(ctx, {
                message: err
            });
        }

    },

    async bindEmailOrPhoneNum(ctx, app) {

        try {

            let fields = ctx.request.body || {};

            let userInfo = ctx.session.user;
            let bindType = fields.type;
            let errMsg = '';

            if (bindType != '1' && bindType != '2') {
                throw new Error(ctx.__('validate_error_params'));
            }

            if (bindType == '1') {
                if (!fields.phoneNum || !validatorUtil.checkPhoneNum((fields.phoneNum).toString())) {
                    errMsg = ctx.__("validate_inputCorrect", [ctx.__("label_user_phoneNum")])
                }

                if (!fields.countryCode) {
                    errMsg = ctx.__("validate_selectNull", [ctx.__("label_user_countryCode")]);
                }

                if (userInfo.phoneNum) {
                    throw new Error(ctx.__("user_action_tips_repeat", [ctx.__('lc_bind')]));
                }

                let queryUserObj = {
                    $or: [{
                        phoneNum: fields.phoneNum,
                    }, {
                        phoneNum: '0' + fields.phoneNum,
                    }],
                    countryCode: fields.countryCode
                };

                if (fields.phoneNum.indexOf('0') == '0') {
                    queryUserObj = {
                        $or: [{
                            phoneNum: fields.phoneNum
                        }, {
                            phoneNum: fields.phoneNum.substr(1),
                        }],
                        countryCode: fields.countryCode
                    };
                }

                let userRecords = await ctx.service.user.item(ctx, {
                    query: queryUserObj
                });

                if (!_.isEmpty(userRecords)) {
                    throw new Error(ctx.__('validate_user_had_bind'));
                }

            } else {
                if (!validatorUtil.checkEmail(fields.email)) {
                    errMsg = ctx.__("validate_inputCorrect", [ctx.__("label_user_email")]);
                }

                if (userInfo.email) {
                    throw new Error(ctx.__("user_action_tips_repeat", [ctx.__('lc_bind')]));
                }

                let userRecords = await ctx.service.user.item(ctx, {
                    query: {
                        email: fields.email
                    }
                });
                if (!_.isEmpty(userRecords)) {
                    throw new Error(ctx.__('validate_user_had_bind'));
                }
            }

            let endStr = bindType == '2' ? fields.email : (fields.countryCode + fields.phoneNum);

            let currentCode = await getCacheValueByKey(app.config.session_secret + '_sendMessage_tourist_bindAccount_' + endStr);

            if (!fields.messageCode || !validator.isNumeric((fields.messageCode).toString()) || (fields.messageCode).length != 6 || currentCode != fields.messageCode) {
                errMsg = ctx.__("validate_inputCorrect", [ctx.__("label_user_imageCode")])
            }

            if (errMsg) {
                throw new Error(errMsg);
            }

            const userObj = {};

            if (bindType == '1') {
                userObj.phoneNum = fields.phoneNum;
                userObj.countryCode = fields.countryCode;
            } else {
                userObj.email = fields.email;
            }

            await ctx.service.user.update(ctx, userInfo._id, userObj);

            ctx.helper.clearRedisByType(endStr, '_sendMessage_tourist_bindAccount_');

            ctx.helper.renderSuccess(ctx);

        } catch (err) {
            ctx.helper.renderFail(ctx, {
                message: err
            });
        }

    },



    async loginAction(ctx, app) {

        try {

            let fields = ctx.request.body || {};
            let errMsg = '',
                loginType = fields.loginType || '1'; // 1:手机验证码登录 2:手机号密码登录 3:邮箱密码登录

            // TODO 临时兼容没有改动的APP端
            if (fields.phoneNum && fields.password) {
                loginType = 2;
            }

            if (fields.email && fields.password) {
                loginType = 3;
            }

            if (loginType != '1' && loginType != '2' && loginType != '3' && loginType != '4') {
                throw new Error(ctx.__('validate_error_params'));
            }

            if (loginType == '1' || loginType == '2') {

                if (!fields.phoneNum || !validatorUtil.checkPhoneNum((fields.phoneNum).toString())) {
                    errMsg = ctx.__("validate_inputCorrect", [ctx.__("label_user_phoneNum")])
                }

                if (!fields.countryCode) {
                    errMsg = ctx.__("validate_selectNull", [ctx.__("label_user_countryCode")]);
                }

                if (loginType == '2') {
                    if (!validatorUtil.checkPwd(fields.password, 6, 12)) {
                        errMsg = ctx.__("validate_rangelength", [ctx.__("label_user_password"), 6, 12])
                    }
                } else if (loginType == '1') {

                    let currentCode = await getCacheValueByKey(app.config.session_secret + '_sendMessage_login_' + (fields.countryCode + fields.phoneNum));
                    if (!fields.messageCode || !validator.isNumeric((fields.messageCode).toString()) || (fields.messageCode).length != 6 || currentCode != fields.messageCode) {
                        errMsg = ctx.__("validate_inputCorrect", [ctx.__("label_user_imageCode")])
                    }
                }

            } else if (loginType == '3') {
                if (!validatorUtil.checkEmail(fields.email)) {
                    errMsg = ctx.__("validate_inputCorrect", [ctx.__("label_user_email")]);
                }
                if (!validatorUtil.checkPwd(fields.password, 6, 12)) {
                    errMsg = ctx.__("validate_rangelength", [ctx.__("label_user_password"), 6, 12])
                }
            } else if (loginType == '4') {
                if (!validatorUtil.checkEmail(fields.email)) {
                    errMsg = ctx.__("validate_inputCorrect", [ctx.__("label_user_email")]);
                }
                let currentCode = await getCacheValueByKey(app.config.session_secret + '_sendMessage_login_' + fields.email);
                if (!fields.messageCode || !validator.isNumeric((fields.messageCode).toString()) || (fields.messageCode).length != 6 || currentCode != fields.messageCode) {
                    errMsg = ctx.__("validate_inputCorrect", [ctx.__("label_user_imageCode")])
                }
            }

            if (errMsg) {
                throw new Error(errMsg);
            }

            let queryUserObj = {
                $or: [{
                    phoneNum: fields.phoneNum
                }, {
                    phoneNum: '0' + fields.phoneNum
                }],
                countryCode: fields.countryCode
            };

            if (loginType != '3' && loginType != '4' && fields.phoneNum.indexOf('0') == '0') {
                queryUserObj = {
                    $or: [{
                        phoneNum: fields.phoneNum
                    }, {
                        phoneNum: fields.phoneNum.substr(1)
                    }],
                    countryCode: fields.countryCode
                };
            }

            let userObj = {};
            if (loginType == '1') {
                _.assign(userObj, queryUserObj)
            } else if (loginType == '2') {
                _.assign(userObj, queryUserObj, {
                    password: ctx.helper.encrypt(fields.password, app.config.encrypt_key)
                })
            } else if (loginType == '3') {
                _.assign(userObj, {
                    email: fields.email
                }, {
                    password: ctx.helper.encrypt(fields.password, app.config.encrypt_key)
                })
            } else if (loginType == '4') {
                _.assign(userObj, {
                    email: fields.email
                })
                queryUserObj = {
                    email: fields.email
                }
            }

            // 初级校验
            let userCount = await ctx.service.user.count(queryUserObj);
            if (userCount > 0 || loginType == '2' || loginType == '3') {
                // 校验登录用户合法性
                let user = await ctx.service.user.item(ctx, {
                    query: userObj,
                    files: getAuthUserFields('login')
                })

                if (_.isEmpty(user)) {
                    if (loginType == '2') {
                        throw new Error(ctx.__('validate_login_notSuccess_1'));
                    } else {
                        throw new Error(ctx.__('validate_login_notSuccess'));
                    }
                }
                if (!user.enable) {
                    throw new Error(ctx.__("validate_user_forbiden"));
                }

                if (!user.loginActive) {
                    await ctx.service.user.update(ctx, user._id, {
                        loginActive: true
                    })
                }

                let renderUser = JSON.parse(JSON.stringify(user));

                // 针对 App 端同时创建 Token
                renderUser.token = jwt.sign({
                    userId: user._id
                }, app.config.encrypt_key, {
                    expiresIn: '30day'
                })

                // 将cookie存入缓存
                ctx.cookies.set('api_' + app.config.auth_cookie_name, renderUser.token, {
                    path: '/',
                    maxAge: 1000 * 60 * 60 * 24 * 30,
                    signed: true,
                    httpOnly: true
                }); //cookie 有效期30天

                // 重置验证码
                let endStr = loginType == '3' ? fields.email : (fields.countryCode + fields.phoneNum);
                ctx.helper.clearRedisByType(endStr, '_sendMessage_login_');
                // console.log('--111---',renderUser)
                ctx.helper.renderSuccess(ctx, {
                    data: renderUser,
                    message: ctx.__("validate_user_loginOk")
                });
            } else {
                console.log('No user,create new User');
                // 没有该用户数据，新建该用户
                let createUserObj = {
                    group: '0',
                    creativeRight: false,
                    loginActive: true,
                    birth: '1770-01-01',
                    enable: true
                };

                if (loginType == '1') {
                    createUserObj.phoneNum = fields.phoneNum;
                    createUserObj.countryCode = fields.countryCode;
                    createUserObj.userName = fields.phoneNum;
                } else if (loginType == '4') {
                    createUserObj.email = fields.email;
                    createUserObj.userName = fields.email;
                }

                let currentUser = await ctx.service.user.create(createUserObj);
                let newUser = await ctx.service.user.item(ctx, {
                    query: {
                        _id: currentUser._id
                    },
                    files: getAuthUserFields('login')
                })
                let renderUser = JSON.parse(JSON.stringify(newUser));

                renderUser.token = jwt.sign({
                    userId: renderUser._id
                }, app.config.encrypt_key, {
                    expiresIn: '30day'
                })
                ctx.cookies.set('api_' + app.config.auth_cookie_name, renderUser.token, {
                    path: '/',
                    maxAge: 1000 * 60 * 60 * 24 * 30,
                    signed: true,
                    httpOnly: true
                });

                // 重置验证码
                let endStr = loginType == '3' ? fields.email : (fields.countryCode + fields.phoneNum);
                ctx.helper.clearRedisByType(endStr, '_sendMessage_login_');
                ctx.helper.renderSuccess(ctx, {
                    data: renderUser,
                    message: ctx.__("validate_user_loginOk")
                });

            }
        } catch (err) {
            ctx.helper.renderFail(ctx, {
                message: err
            });
        }
    },

    async touristLoginAction(ctx, app) {

        try {

            let fields = ctx.request.body || {};
            let userCode = fields.userCode;

            if (!userCode) {
                throw new Error(ctx.__('validate_error_params'));
            }

            let renderCode = ctx.helper.decryptApp(app.config.encryptApp_key, app.config.encryptApp_vi, userCode);

            if (!renderCode) {
                throw new Error(ctx.__('validate_error_params'));
            }

            let targetUser = await ctx.service.user.item(ctx, {
                query: {
                    deviceId: renderCode
                }
            });

            if (!_.isEmpty(targetUser)) {

                console.log('get old tourist User');

                if (!targetUser.enable) {
                    throw new Error(ctx.__("validate_user_forbiden"));
                }

                let renderUser = JSON.parse(JSON.stringify(targetUser));

                // 针对 App 端同时创建 Token
                renderUser.token = jwt.sign({
                    userId: targetUser._id
                }, app.config.encrypt_key, {
                    expiresIn: '30day'
                })

                ctx.helper.renderSuccess(ctx, {
                    data: renderUser,
                    message: ctx.__("validate_user_loginOk")
                });

            } else {
                console.log('create new tourist User');
                // 没有该用户数据，新建该用户
                let createUserObj = {
                    userName: renderCode,
                    deviceId: renderCode,
                    group: '0',
                    creativeRight: false,
                    loginActive: true,
                    birth: '1770-01-01',
                    enable: true
                };

                let currentUser = await ctx.service.user.create(createUserObj);

                let newUser = await ctx.service.user.item(ctx, {
                    query: {
                        _id: currentUser._id
                    },
                    files: getAuthUserFields('login')
                });
                let renderUser = JSON.parse(JSON.stringify(newUser));

                renderUser.token = jwt.sign({
                    userId: renderUser._id
                }, app.config.encrypt_key, {
                    expiresIn: '30day'
                })

                ctx.helper.renderSuccess(ctx, {
                    data: renderUser,
                    message: ctx.__("validate_user_loginOk")
                });

            }

        } catch (err) {
            ctx.helper.renderFail(ctx, {
                message: err
            });
        }

    },


    async regAction(ctx, app) {

        try {

            let fields = ctx.request.body || {};
            let errMsg = '';
            let regType = fields.regType || '1'; // 1:手机号注册  2:邮箱注册

            if (regType != '1' && regType != '2') {
                throw new Error(ctx.__('validate_error_params'));
            }

            if (regType == '1') {
                if (!fields.phoneNum || !validatorUtil.checkPhoneNum((fields.phoneNum).toString())) {
                    errMsg = ctx.__("validate_inputCorrect", [ctx.__("label_user_phoneNum")])
                }

                if (!fields.countryCode) {
                    errMsg = ctx.__("validate_selectNull", [ctx.__("label_user_countryCode")]);
                }

            } else if (regType == '2') {
                if (!validatorUtil.checkEmail(fields.email)) {
                    errMsg = ctx.__("validate_inputCorrect", [ctx.__("label_user_email")]);
                }
            }

            let endStr = regType == '1' ? (fields.countryCode + fields.phoneNum) : fields.email;
            let currentCode = await getCacheValueByKey(app.config.session_secret + '_sendMessage_reg_' + endStr);

            if (!validator.isNumeric((fields.messageCode).toString()) || (fields.messageCode).length != 6 || currentCode != fields.messageCode) {
                errMsg = ctx.__("validate_inputCorrect", [ctx.__("label_user_imageCode")])
            }

            if (fields.userName && !validator.isLength(fields.userName, 2, 12)) {
                errMsg = ctx.__("validate_rangelength", [ctx.__("label_user_userName"), 2, 12]);
            }

            if (fields.userName && !validatorUtil.isRegularCharacter(fields.userName)) {
                errMsg = ctx.__("validate_error_field", [ctx.__("label_user_userName")]);
            }

            if (!validatorUtil.checkPwd(fields.password, 6, 12)) {
                errMsg = ctx.__("validate_rangelength", [ctx.__("label_user_password"), 6, 12])
            }

            if (errMsg) {
                throw new Error(errMsg);
            }

            const userObj = {
                userName: fields.userName || fields.phoneNum,
                countryCode: fields.countryCode,
                logo: fields.logo,
                phoneNum: fields.phoneNum,
                email: fields.email,
                group: '0',
                creativeRight: false,
                password: ctx.helper.encrypt(fields.password, app.config.encrypt_key),
                loginActive: false,
                enable: true
            }

            let queryUserObj = {};
            if (regType == '1') {

                queryUserObj = {
                    $or: [{
                        phoneNum: fields.phoneNum
                    }, {
                        phoneNum: '0' + fields.phoneNum
                    }]
                };

                if (fields.phoneNum.indexOf('0') == '0') {
                    queryUserObj = {
                        $or: [{
                            phoneNum: fields.phoneNum
                        }, {
                            phoneNum: fields.phoneNum.substr(1)
                        }]
                    };
                }

            } else if (regType == '2') {
                queryUserObj = {
                    email: fields.email
                }
                userObj.userName = userObj.userName || fields.email;
            }

            let user = await ctx.service.user.item(ctx, {
                query: queryUserObj
            });

            if (!_.isEmpty(user)) {
                throw new Error(ctx.__("validate_hadUse_userNameOrEmail"));
            } else {

                let endUser = await ctx.service.user.create(userObj);

                ctx.session.user = await ctx.service.user.item(ctx, {
                    query: {
                        _id: endUser._id
                    },
                    files: getAuthUserFields('session')
                });

                // 重置验证码
                ctx.helper.clearRedisByType(endStr, '_sendMessage_reg_');

                ctx.helper.renderSuccess(ctx, {
                    message: ctx.__("validate_user_regOk")
                });
            }
        } catch (err) {
            ctx.helper.renderFail(ctx, {
                message: err
            });
        }

    },

    async checkPhoneNumExist(ctx, app) {

        try {

            let phoneNum = ctx.query.phoneNum || '';
            let countryCode = ctx.query.countryCode || '';
            let errMsg = "";

            if (!phoneNum || !validatorUtil.checkPhoneNum((phoneNum).toString())) {
                errMsg = ctx.__("validate_inputCorrect", [ctx.__("label_user_phoneNum")])
            }

            if (!validator.isNumeric(countryCode.toString())) {
                errMsg = ctx.__("validate_inputCorrect", [ctx.__("label_user_countryCode")])
            }

            if (errMsg) {
                throw new Error(errMsg);
            }

            let queryUserObj = {
                $or: [{
                    phoneNum: phoneNum
                }, {
                    phoneNum: '0' + phoneNum
                }],
                countryCode: countryCode
            };

            if (phoneNum.indexOf('0') == '0') {
                queryUserObj = {
                    $or: [{
                        phoneNum: phoneNum
                    }, {
                        phoneNum: phoneNum.substr(1)
                    }],
                    countryCode: countryCode
                };
            }

            let targetUser = await ctx.service.user.item(ctx, {
                query: queryUserObj
            });
            let checkState = false;
            if (!_.isEmpty(targetUser)) {
                checkState = true;
            }

            ctx.helper.renderSuccess(ctx, {
                data: {
                    checkState
                }
            });

        } catch (err) {
            ctx.helper.renderFail(ctx, {
                message: err
            });
        }
    },

    async checkHadSetLoginPassword(ctx, app) {

        try {

            let userInfo = ctx.session.user;
            let targetUser = await ctx.service.user.item(ctx, {
                query: {
                    _id: userInfo._id
                }
            });
            let checkState = false;
            if (!_.isEmpty(targetUser) && targetUser.password) {
                checkState = true;
            }

            ctx.helper.renderSuccess(ctx, {
                data: {
                    checkState
                }
            });

        } catch (err) {
            ctx.helper.renderFail(ctx, {
                message: err
            });
        }
    },

    async logOut(ctx, app) {

        ctx.session = null;
        ctx.cookies.set('api_' + app.config.auth_cookie_name, null);
        ctx.helper.renderSuccess(ctx, {
            message: ctx.__("validate_user_logoutOk")
        });

    },

    async sentConfirmEmail(ctx, app) {


        try {

            let fields = ctx.request.body || {};
            let targetEmail = fields.email;
            // 获取当前发送邮件的时间
            let retrieveTime = new Date().getTime();
            if (!validator.isEmail(targetEmail)) {
                throw new Error(ctx.__('validate_error_params'));
            } else {

                let user = await ctx.service.user.item(ctx, {
                    query: {
                        'email': targetEmail
                    },
                    files: 'userName email password _id'
                });
                if (!_.isEmpty(user) && user._id) {

                    await ctx.service.user.update(ctx, user._id, {
                        retrieve_time: retrieveTime
                    });
                    //发送通知邮件给用户
                    const systemConfigs = await ctx.service.systemConfig.find({
                        isPaging: '0'
                    });
                    if (!_.isEmpty(systemConfigs)) {
                        ctx.helper.sendEmail(systemConfigs[0], emailTypeKey.email_findPsd, {
                            email: targetEmail,
                            userName: user.userName,
                            password: user.password
                        })
                        ctx.helper.renderSuccess(ctx, {
                            message: ctx.__("label_resetpwd_sendEmail_success")
                        });
                    }
                } else {
                    ctx.helper.renderFail(ctx, {
                        message: ctx.__("label_resetpwd_noemail")
                    });
                }
            }

        } catch (err) {
            ctx.helper.renderFail(ctx, {
                message: err
            });
        }

    },

    async reSetPass(ctx, app) {
        let params = ctx.query;
        let tokenId = params.key;
        let keyArr = ctx.helper.getKeyArrByTokenId(tokenId);

        if (keyArr && validator.isEmail(keyArr[1])) {

            try {
                const {
                    ctx,
                    service
                } = this;
                let defaultTemp = await ctx.service.contentTemplate.item(ctx, {
                    query: {
                        'using': true
                    },
                    populate: ['items']
                });
                let noticeTempPath = app.config.temp_view_forder + defaultTemp.alias + '/users/userNotice.html';
                let reSetPwdTempPath = app.config.temp_view_forder + defaultTemp.alias + '/users/userResetPsd.html';

                let user = await ctx.service.user.item(ctx, {
                    query: {
                        'email': keyArr[1]
                    },
                    files: 'email password _id retrieve_time'
                })
                // console.log('---user---', user)
                // console.log('---keyArr---', keyArr)
                if (!_.isEmpty(user) && user._id) {

                    if (user.password == keyArr[0] && keyArr[2] == app.config.session_secret) {
                        //  校验链接是否过期
                        let now = new Date().getTime();
                        let oneDay = 1000 * 60 * 60 * 24;
                        // let localKeys = await siteFunc.getSiteLocalKeys(ctx.session.locale, res);
                        if (!user.retrieve_time || now - user.retrieve_time > oneDay) {
                            let renderData = {
                                infoType: "warning",
                                infoContent: ctx.__("label_resetpwd_link_timeout"),
                                staticforder: defaultTemp.alias,
                                // lk: localKeys.renderKeys
                            }
                            ctx.render(noticeTempPath, renderData);
                        } else {
                            let renderData = {
                                tokenId,
                                staticforder: defaultTemp.alias,
                                // lk: localKeys.renderKeys
                            };
                            ctx.render(reSetPwdTempPath, renderData);
                        }
                    } else {
                        // let localKeys = await siteFunc.getSiteLocalKeys(ctx.session.locale, res);
                        ctx.render(noticeTempPath, {
                            infoType: "warning",
                            infoContent: ctx.__("label_resetpwd_error_message"),
                            staticforder: defaultTemp.alias,
                            // lk: localKeys.renderKeys
                        });
                    }
                } else {
                    ctx.helper.renderFail(ctx, {
                        message: ctx.__("label_resetpwd_noemail")
                    });
                }
            } catch (err) {
                ctx.helper.renderFail(ctx, {
                    message: err
                });
            }
        } else {
            ctx.helper.renderFail(ctx, {
                message: ctx.__("label_resetpwd_noemail")
            });
        }
    },

    // 根据手机验证码找回密码
    async resetMyPassword(ctx, app) {

        try {

            let fields = ctx.request.body || {};
            let phoneNum = fields.phoneNum;
            let countryCode = fields.countryCode;
            let messageCode = fields.messageCode;

            let type = fields.type || '1';
            let errMsg = "";

            if (type != '1' && type != '2') {
                throw new Error(ctx.__("validate_error_params"));
            }

            if (type == '1') {
                if (!phoneNum || !validator.isNumeric(phoneNum.toString())) {
                    throw new Error(ctx.__("validate_inputCorrect", [ctx.__("label_user_phoneNum")]));
                }

                if (!countryCode) {
                    errMsg = ctx.__("validate_selectNull", [ctx.__("label_user_countryCode")]);
                }

            } else if (type == '2') {
                if (!validatorUtil.checkEmail(fields.email)) {
                    throw new Error(ctx.__("validate_inputCorrect", [ctx.__("label_user_email")]));
                }
            }

            let endStr = type == '1' ? (fields.countryCode + fields.phoneNum) : fields.email;
            let currentCode = await getCacheValueByKey(app.config.session_secret + '_sendMessage_resetPassword_' + endStr);

            if (!validator.isNumeric((messageCode).toString()) || (messageCode).length != 6 || currentCode != fields.messageCode) {
                errMsg = ctx.__("validate_inputCorrect", [ctx.__("label_user_imageCode")])
            }

            if (!fields.password) {
                errMsg = ctx.__("validate_inputCorrect", [ctx.__("label_user_password")])
            }

            if (errMsg) {
                throw new Error(errMsg);
            }

            let queryUserObj = {
                $or: [{
                    phoneNum: fields.phoneNum
                }, {
                    phoneNum: '0' + fields.phoneNum
                }],
                countryCode: fields.countryCode
            };

            if (type == '1') {
                if (fields.phoneNum.indexOf('0') == '0') {
                    queryUserObj = {
                        $or: [{
                            phoneNum: fields.phoneNum
                        }, {
                            phoneNum: fields.phoneNum.substr(1)
                        }],
                        countryCode: fields.countryCode
                    };
                }
            } else if (type == '2') {
                queryUserObj = {
                    email: fields.email
                }
            }

            let targetUser = await ctx.service.user.item(ctx, {
                query: queryUserObj
            });

            if (!_.isEmpty(targetUser)) {

                await ctx.service.user.update(ctx, targetUser._id, {
                    password: ctx.helper.encrypt(fields.password, app.config.encrypt_key)
                })

                // 重置验证码
                ctx.helper.clearRedisByType(endStr, '_sendMessage_resetPassword_');

                ctx.helper.renderSuccess(ctx, {
                    message: ctx.__('restful_api_response_success', [ctx.__('lc_basic_set_password')])
                });

            } else {
                throw new Error(ctx.__('label_resetpwd_error_message'));
            }


        } catch (err) {
            ctx.helper.renderFail(ctx, {
                message: err
            });
        }

    },

    // web 端找回密码
    async updateNewPsd(ctx, app) {



        let fields = ctx.request.body || {};
        let errMsg = '';
        if (!fields.tokenId) {
            errMsg = 'token is null'
        }

        if (!fields.password) {
            errMsg = 'password is null'
        }

        if (fields.password != fields.confirmPassword) {
            errMsg = ctx.__("validate_error_pass_atypism")
        }

        if (errMsg) {
            throw new Error(errMsg);
        } else {
            var keyArr = ctx.helper.getKeyArrByTokenId(fields.tokenId);
            if (keyArr && validator.isEmail(keyArr[1])) {
                try {
                    const {
                        ctx,
                        service
                    } = this;

                    let user = await ctx.service.user.item(ctx, {
                        query: {
                            'email': keyArr[1]
                        },
                        files: 'userName email password _id'
                    })
                    if (!_.isEmpty(user) && user._id) {
                        if (user.password == keyArr[0] && keyArr[2] == app.config.session_secret) {
                            let currentPwd = ctx.helper.encrypt(fields.password, app.config.encrypt_key);

                            await ctx.service.user.update(ctx, user._id, {
                                password: currentPwd,
                                retrieve_time: ''
                            })
                            ctx.helper.renderSuccess(ctx);
                        } else {
                            throw new Error(ctx.__('validate_error_params'));
                        }
                    } else {
                        throw new Error(ctx.__('validate_error_params'));
                    }
                } catch (error) {
                    ctx.helper.renderFail(ctx, {
                        message: ctx.__("validate_error_params")
                    });
                }
            } else {
                ctx.helper.renderFail(ctx, {
                    message: ctx.__("validate_error_params")
                });
            }
        }

    },

    // app 端修改密码
    async modifyMyPsd(ctx, app) {

        try {

            let fields = ctx.request.body || {};

            let errMsg = '';
            let userInfo = ctx.session.user || {};

            if (!fields.oldPassword) {
                errMsg = 'oldPassword is null'
            }

            if (!fields.password) {
                errMsg = 'password is null'
            }

            if (errMsg) {
                throw new Error(ctx.__('validate_error_params'));
            }

            let targetUser = await ctx.service.user.item(ctx, {
                query: {
                    _id: userInfo._id,
                    password: ctx.helper.encrypt(fields.oldPassword, app.config.encrypt_key)
                }
            })

            if (!_.isEmpty(targetUser)) {

                await ctx.service.user.update(ctx, userInfo._id, {
                    password: ctx.helper.encrypt(fields.password, app.config.encrypt_key)
                });

                ctx.helper.renderSuccess(ctx, {
                    message: ctx.__('restful_api_response_success', [ctx.__('lc_basic_set_password')])
                });

            } else {
                throw new Error(ctx.__('label_resetpwd_error_message'));
            }

        } catch (err) {
            ctx.helper.renderFail(ctx, {
                message: err
            });
        }

    },

    async postEmailToAdminUser(ctx, app) {

        try {

            let fields = ctx.request.body || {};
            let errMsg = "";
            if (fields.name && !validator.isLength(fields.name, 2, 16)) {
                errMsg = ctx.__("validate_rangelength", [ctx.__("label_name"), 2, 16]);
            }
            if (fields.phoneNum && !validatorUtil.checkPhoneNum(fields.phoneNum)) {
                errMsg = ctx.__("validate_inputCorrect", [ctx.__("label_user_phoneNum")]);
            }
            if (!validatorUtil.checkEmail(fields.email)) {
                errMsg = ctx.__("validate_inputCorrect", [ctx.__("label_user_email")]);
            }
            if (fields.comments && !validator.isLength(fields.comments, 5, 1000)) {
                errMsg = ctx.__("validate_rangelength", [ctx.__("label_comments"), 5, 100]);
            }
            if (errMsg) {
                throw new Error(errMsg);
            } else {
                const systemConfigs = await ctx.service.systemConfig.find({
                    isPaging: '0'
                });
                ctx.helper.sendEmail(systemConfigs[0], emailTypeKey.email_notice_admin_byContactUs, {
                    email: fields.email,
                    name: fields.name,
                    phoneNum: fields.phoneNum,
                    comments: xss(fields.comments)
                })
                // 给用户发邮件
                ctx.helper.sendEmail(systemConfigs[0], emailTypeKey.email_notice_user_byContactUs, {
                    email: fields.email,
                    name: fields.name,
                    phoneNum: fields.phoneNum,
                    comments: xss(fields.comments)
                })

                ctx.helper.renderSuccess(ctx, {
                    message: ctx.__("lc_sendEmail_user_success_notice")
                });
            }
        } catch (err) {
            ctx.helper.renderFail(ctx, {
                message: err
            });
        }
    },

    // 关注标签
    async addTags(ctx, app) {

        try {

            let userInfo = await ctx.service.user.item(ctx, {
                query: {
                    _id: ctx.session.user._id
                },
                files: 'watchTags'
            });
            let tagId = ctx.query.tagId;
            let followState = ctx.query.type;
            if (!shortid.isValid(tagId)) {
                throw new Error(ctx.__("validate_error_params"));
            }

            let targetTag = await ctx.service.contentTag.item(ctx, {
                query: {
                    _id: tagId
                }
            })
            if (_.isEmpty(targetTag)) {
                throw new Error(ctx.__("validate_error_params"));
            }
            let oldWatchTag = userInfo.watchTags || [];
            let oldWatchTagArr = _.concat([], oldWatchTag);
            if (oldWatchTagArr.indexOf(tagId) >= 0 && followState == '1') {
                throw new Error(ctx.__("validate_error_repost"));
            } else {
                if (followState == '1') {
                    // oldWatchTagArr.push(tagId);
                    await ctx.service.user.addToSet(ctx, userInfo._id, {
                        watchTags: tagId
                    })
                } else if (followState == '0') {
                    // oldWatchTagArr = _.filter(oldWatchTagArr, (item) => {
                    //     return item != tagId;
                    // })
                    await ctx.service.user.pull(ctx, userInfo._id, {
                        watchTags: tagId
                    })
                } else {
                    throw new Error(ctx.__("validate_error_params"));
                }
                // oldWatchTagArr = _.uniq(oldWatchTagArr);

                // await ctx.service.user.update(ctx, userInfo._id, {
                //     watchTags: oldWatchTagArr
                // });

                ctx.helper.renderSuccess(ctx);

            }
        } catch (err) {
            ctx.helper.renderFail(ctx, {
                message: err
            });
        }

    },


    // 关注
    async followCreator(ctx, app) {

        try {

            let userInfo = ctx.session.user;
            let userId = userInfo._id;
            let creatorIds = ctx.query.creatorId;
            let creatorFollowState = ctx.query.followState || 'in';

            if (!creatorIds) {
                throw new Error(ctx.__("validate_error_params"));
            }

            let creatorIdArr = creatorIds.split(',');
            let targetWatcher = await ctx.service.user.item(ctx, {
                query: {
                    _id: userId
                }
            })
            for (const creatorId of creatorIdArr) {
                if (!shortid.isValid(creatorId)) {
                    throw new Error(ctx.__("validate_error_params"));
                }

                if (creatorId == userId) {
                    throw new Error(ctx.__("user_action_tips_subscribe_self"));
                }
                // console.log('---creatorId---', creatorId);
                let targetCreatorFollow = await ctx.service.user.item(ctx, {
                    query: {
                        _id: creatorId
                    }
                })
                // console.log('---targetCreatorFollow---', targetCreatorFollow);
                if (_.isEmpty(targetCreatorFollow)) {
                    throw new Error(ctx.__("validate_error_params"));
                }

                let userWatcherArr = _.concat([], targetWatcher.watchers);
                let creatorFollowersArr = _.concat([], targetCreatorFollow.followers);

                if (userWatcherArr.indexOf(userId) >= 0 && creatorFollowState == 'in') {
                    throw new Error(ctx.__("validate_error_repost"));
                } else {

                    if (creatorFollowState == 'in') {
                        // 记录本人主动关注
                        await ctx.service.user.addToSet(ctx, userId, {
                            "watchers": targetCreatorFollow._id
                        })
                        // 记录会员被关注
                        await ctx.service.user.addToSet(ctx, targetCreatorFollow._id, {
                            "followers": userId
                        })
                    } else if (creatorFollowState == 'out') {
                        // 记录本人主动取消关注
                        await ctx.service.user.pull(ctx, userId, {
                            "watchers": targetCreatorFollow._id
                        })
                        // 记录会员被取消关注
                        await ctx.service.user.pull(ctx, targetCreatorFollow._id, {
                            "followers": userId
                        })
                    } else {
                        throw new Error(ctx.__("validate_error_params"));
                    }

                    // 发送关注消息
                    if (creatorFollowState == 'in') {
                        siteFunc.addSiteMessage('2', userInfo, targetCreatorFollow._id);
                    }
                }

                ctx.helper.renderSuccess(ctx, {
                    data: ctx.__('restful_api_response_success', [ctx.__(creatorFollowState === 'in' ? 'user_action_tips_add_creator' : 'user_action_tips_unsubscribe_creator')])
                });
            }
        } catch (err) {
            ctx.helper.renderFail(ctx, {
                message: err
            });
        }

    },


    async sendVerificationCode(ctx, app) {

        try {

            let fields = ctx.request.body || {};
            let phoneNum = fields.phoneNum;
            let email = fields.email;
            let countryCode = fields.countryCode;
            let messageType = fields.messageType;
            let sendType = fields.sendType || '1'; // 1: 短信验证码  2:邮箱验证码

            // 针对管理员
            let userName = fields.userName;
            let password = fields.password;

            let cacheKey = '',
                errMsg = "";

            // 管理员登录
            if (messageType == '5') {

                if (!userName || !password) {
                    throw new Error(ctx.__('label_systemnotice_nopower'));
                }

                let targetAdminUser = await ctx.service.adminUser.item(ctx, {
                    query: {
                        userName,
                        password
                    }
                })

                if (!_.isEmpty(targetAdminUser)) {
                    phoneNum = targetAdminUser.phoneNum;
                    countryCode = targetAdminUser.countryCode;
                } else {
                    throw new Error(ctx.__('label_systemnotice_nopower'));
                }

            } else {

                if (sendType == '1') {
                    if (!phoneNum || !validator.isNumeric(phoneNum.toString())) {
                        errMsg = ctx.__("validate_inputCorrect", [ctx.__("label_user_phoneNum")]);
                    }

                    if (!fields.countryCode) {
                        errMsg = ctx.__("validate_selectNull", [ctx.__("label_user_countryCode")]);
                    }
                } else if (sendType == '2') {
                    if (!validatorUtil.checkEmail(fields.email)) {
                        errMsg = ctx.__("validate_inputCorrect", [ctx.__("label_user_email")]);
                    }
                }

            }

            if (!messageType) {
                errMsg = ctx.__("validate_error_params");
            }

            if (errMsg) {
                throw new Error(errMsg);
            }

            // 生成短信验证码
            let currentStr = siteFunc.randomString(6, '123456789');

            if (messageType == '0') { // 注册验证码
                cacheKey = '_sendMessage_reg_';
            } else if (messageType == '1') { // 登录获取验证码
                cacheKey = '_sendMessage_login_';
            } else if (messageType == '2') { // 忘记资金密码获取验证码
                cacheKey = '_sendMessage_reSetFunPassword_';
            } else if (messageType == '3') { // 忘记登录密码找回
                cacheKey = '_sendMessage_resetPassword_';
            } else if (messageType == '4') { // 身份认证
                cacheKey = '_sendMessage_identity_verification_';
            } else if (messageType == '5') { // 管理员登录
                cacheKey = '_sendMessage_adminUser_login_';
            } else if (messageType == '6') { // 游客绑定邮箱或手机号
                cacheKey = '_sendMessage_tourist_bindAccount_';
            } else {
                throw new Error(ctx.__("validate_error_params"));
            }

            let endStr = sendType == '1' ? (countryCode + phoneNum) : email;
            let currentKey = app.config.session_secret + cacheKey + endStr;
            console.log(currentStr, '---currentKey---', currentKey)
            cache.set(currentKey, currentStr, 1000 * 60 * 10); // 验证码缓存10分钟

            // 验证码加密
            let renderCode = ctx.helper.encryptApp(app.config.encryptApp_key, app.config.encryptApp_vi, currentStr);
            console.log('renderCode: ', renderCode);

            if (sendType == '1') {
                // 发送短消息
                (process.env.NODE_ENV == 'production') && siteFunc.sendTellMessagesByPhoneNum(countryCode, phoneNum, currentStr.toString());
            } else if (sendType == '2') {
                //发送通知邮件给用户
                const systemConfigs = await ctx.service.systemConfig.find({
                    isPaging: '0'
                });
                if (!_.isEmpty(systemConfigs)) {
                    (process.env.NODE_ENV == 'production') && ctx.helper.sendEmail(systemConfigs[0], emailTypeKey.email_sendMessageCode, {
                        email: email,
                        renderCode: currentStr
                    })
                } else {
                    throw new Error(ctx.__('validate_error_params'));
                }
            } else {
                throw new Error(ctx.__('validate_error_params'));
            }

            ctx.helper.renderSuccess(ctx, {
                message: ctx.__('restful_api_response_success', [ctx.__('user_action_tips_sendMessage')]),
                data: {
                    messageCode: renderCode
                }
            });

        } catch (err) {
            ctx.helper.renderFail(ctx, {
                message: err
            });

        }

    },

    // 点赞/取消赞
    async askContentThumbsUp(ctx, app) {

        try {
            let userInfo = ctx.session.user;
            let userId = userInfo._id;
            let contentId = ctx.query.contentId;
            let praiseState = ctx.query.praiseState || 'in';
            if (!shortid.isValid(contentId)) {
                throw new Error(ctx.__("validate_error_params"));
            }

            if (!_.isEmpty(userInfo)) {
                userInfo = await ctx.service.user.item(ctx, {
                    query: {
                        _id: userInfo._id
                    },
                    files: getAuthUserFields('session')
                })
            }

            let targetContent = await ctx.service.content.item(ctx, {
                query: {
                    _id: contentId,
                    state: '2'
                }
            })
            let targetMessage = await ctx.service.message.item(ctx, {
                query: {
                    _id: contentId
                }
            })

            let targetMediaType = '0';

            if (!_.isEmpty(targetContent)) {
                targetMediaType = '0'; // 帖子
                if (targetContent.uAuthor == userId) {
                    throw new Error(ctx.__("user_action_tips_praise_self"));
                }
            } else if (!_.isEmpty(targetMessage)) {
                targetMediaType = '1'; // 评论
                if (targetMessage.author == userId) {
                    throw new Error(ctx.__("user_action_tips_praise_self"));
                }
            } else {
                throw new Error(ctx.__("validate_error_params"));
            }

            let oldPraise = userInfo.praiseContents || [];
            if (targetMediaType == '1') {
                oldPraise = userInfo.praiseMessages || [];
            }

            let oldPraiseArr = _.concat([], oldPraise);
            if (oldPraiseArr.indexOf(contentId) >= 0 && praiseState == 'in') {
                throw new Error(ctx.__("user_action_tips_repeat", [ctx.__('user_action_type_give_thumbs_up')]));
            } else {
                if (praiseState == 'in') {
                    oldPraiseArr.push(contentId);
                } else if (praiseState == 'out') {
                    oldPraiseArr = _.filter(oldPraise, (item) => {
                        return item != contentId;
                    })
                } else {
                    throw new Error(ctx.__("validate_error_params"));
                }
                oldPraiseArr = _.uniq(oldPraiseArr);

                if (targetMediaType == '0') {
                    await ctx.service.user.update(ctx, userInfo._id, {
                        praiseContents: oldPraiseArr
                    })
                } else if (targetMediaType == '1') {
                    await ctx.service.user.update(ctx, userInfo._id, {
                        praiseMessages: oldPraiseArr
                    })
                }

                if (praiseState == 'in') {
                    // 发送提醒消息
                    if (targetMediaType == '0') {
                        siteFunc.addSiteMessage('4', userInfo, targetContent.uAuthor, contentId, {
                            targetMediaType
                        });
                    } else if (targetMediaType == '1') {
                        siteFunc.addSiteMessage('4', userInfo, targetMessage.author, contentId, {
                            targetMediaType
                        });
                    }

                }

                ctx.helper.renderSuccess(ctx, {
                    message: ctx.__('restful_api_response_success', [ctx.__('user_action_type_give_thumbs_up')])
                });
            }
        } catch (err) {
            ctx.helper.renderFail(ctx, {
                message: err
            });
        }

    },

    // 收藏帖子
    async favoriteContent(ctx, app) {

        try {

            let userInfo = await ctx.service.user.item(ctx, {
                query: {
                    _id: ctx.session.user._id
                },
                files: getAuthUserFields('session')
            })
            let contentId = ctx.query.contentId;
            let favoriteState = ctx.query.favoriteState || 'in';
            if (!shortid.isValid(contentId)) {
                throw new Error(ctx.__("validate_error_params"));
            }

            let targetContent = await ctx.service.content.item(ctx, {
                query: {
                    _id: contentId,
                    state: '2'
                }
            })

            let targetContentType = '0';
            if (!_.isEmpty(targetContent)) {
                targetContentType = '0'; // 普通帖子
            } else {
                throw new Error(ctx.__("validate_error_params"));
            }

            let oldFavorite = userInfo.favorites || [];

            let oldFavoriteArr = _.concat([], oldFavorite);
            if (oldFavoriteArr.indexOf(contentId) >= 0 && favoriteState == 'in') {
                throw new Error(ctx.__("user_action_tips_repeat", [ctx.__('user_action_type_give_favorite')]));
            } else {
                if (favoriteState == 'in') {
                    oldFavoriteArr.push(contentId);
                } else if (favoriteState == 'out') {
                    oldFavoriteArr = _.filter(oldFavorite, (item) => {
                        return item != contentId;
                    })
                } else {
                    throw new Error(ctx.__("validate_error_params"));
                }
                oldFavoriteArr = _.uniq(oldFavoriteArr);
                if (targetContentType == '0') {
                    await ctx.service.user.update(ctx, userInfo._id, {
                        favorites: oldFavoriteArr
                    })
                }

                ctx.helper.renderSuccess(ctx, {
                    message: ctx.__('restful_api_response_success', [ctx.__('user_action_type_give_favorite')])
                });
            }
        } catch (err) {
            ctx.helper.renderFail(ctx, {
                message: err
            });
        }
    },

    // 帖子踩
    async despiseContent(ctx, app) {

        try {
            let userInfo = ctx.session.user;
            let contentId = ctx.query.contentId;
            let despiseState = ctx.query.despiseState || 'in';
            if (!shortid.isValid(contentId)) {
                throw new Error(ctx.__("validate_error_params"));
            }

            let targetContent = await ctx.service.content.item(ctx, {
                query: {
                    _id: contentId,
                    state: '2'
                }
            })

            let targetMessage = await ctx.service.message.item(ctx, {
                query: {
                    _id: contentId
                }
            })
            let targetMediaType = '0';

            if (!_.isEmpty(targetContent)) {
                targetMediaType = '0'; // 帖子
            } else if (!_.isEmpty(targetMessage)) {
                targetMediaType = '1'; // 评论
            } else {
                throw new Error(ctx.__("validate_error_params"));
            }

            // console.log('--userInfo-1---',ctx.session.user);
            let oldDespise = userInfo.despises || [];
            if (targetMediaType == '1') {
                oldDespise = userInfo.despiseMessage || [];
            }

            let oldDespiseArr = _.concat([], oldDespise);

            if (oldDespiseArr.indexOf(contentId) >= 0 && despiseState == 'in') {
                throw new Error(ctx.__("user_action_tips_repeat", [ctx.__('user_action_type_give_despise')]));
            } else {
                if (despiseState == 'in') {
                    oldDespiseArr.push(contentId);
                } else if (despiseState == 'out') {
                    oldDespiseArr = _.filter(oldDespise, (item) => {
                        return item != contentId;
                    })
                } else {
                    throw new Error(ctx.__("validate_error_params"));
                }
                oldDespiseArr = _.uniq(oldDespiseArr);

                if (targetMediaType == '0') {

                    await ctx.service.user.update(ctx, userInfo._id, {
                        despises: oldDespiseArr
                    })
                } else if (targetMediaType == '1') {

                    await ctx.service.user.update(ctx, userInfo._id, {
                        despiseMessage: oldDespiseArr
                    })
                }

                ctx.helper.renderSuccess(ctx, {
                    message: ctx.__('restful_api_response_success', [ctx.__('user_action_type_give_despise')])
                });
            }
        } catch (err) {
            ctx.helper.renderFail(ctx, {
                message: err
            });
        }
    },




}

module.exports = RegUserController;