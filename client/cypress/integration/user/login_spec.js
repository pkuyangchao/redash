describe('Login', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('greets the user and take a screenshot', () => {
    cy.contains('h3', '数博数据分析平台');

    cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
    cy.percySnapshot('Login');
  });

  it('shows message on failed login', () => {
    cy.getByTestId('Email').type('admin@redash.io');
    cy.getByTestId('Password').type('wrongpassword{enter}');

    cy.getByTestId('ErrorMessage').should('contain', '用户名或密码有误，请重新输入');
  });

  it('navigates to homepage with successful login', () => {
    cy.getByTestId('Email').type('admin@redash.io');
    cy.getByTestId('Password').type('password{enter}');

    cy.title().should('eq', 'Redash');
    cy.contains('Example Admin');

    cy.wait(1000); // eslint-disable-line cypress/no-unnecessary-waiting
    cy.percySnapshot('Homepage');
  });
});
