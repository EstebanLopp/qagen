const { detectFlow } = require('./src/flow-detector');

const elements = {
  buttons: [{ text: 'Login', type: 'submit', disabled: false, visible: true }],
  inputs: [
    { type: 'text', name: 'username', placeholder: '', visible: true },
    { type: 'password', name: 'password', placeholder: '', visible: true }
  ],
  forms: ['form-0'],
  links: []
};

const pageInfo = {
  title: 'The Internet',
  h1: 'Login Page',
  h2: ''
};

const result = detectFlow('https://the-internet.herokuapp.com/login', elements, pageInfo);
console.log(JSON.stringify(result, null, 2));