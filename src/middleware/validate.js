const validate = (schema) => {
    return (req, res, next) => {
        if(!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({
                errors: ['Request body cannot be empty']
            });
        }

        const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });

        if(error) {
            const errors = error.details.map(detail => detail.message);
            return res.status(400).json({ errors });
        }

        req.body = value;
        next();
    };
};

module.exports = validate;