const {expect} = require('chai');
const validateRegistration = require('../src/modules/validateRegistration.js');

describe('Registration validation', () => {
  it('rejects a missing password', () => {
    expect(validateRegistration({username: 'student'})).to.equal(false);
  });
});