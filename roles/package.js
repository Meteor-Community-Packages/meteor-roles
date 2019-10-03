Package.describe({
  summary: "Authorization package for Meteor",
  version: "1.2.17",
  git: "https://github.com/Meteor-Community-Packages/meteor-roles.git",
  name: "alanning:roles"
});

Package.onUse(function (api) {
  api.versionsFrom("METEOR@1.8.1");

  var both = ['client', 'server'];

  api.use(['underscore',
           'accounts-base',
           'tracker',
           'mongo',
           'check'], both);

  api.use(['blaze@2.3.3'], 'client', {weak: true});

  api.export('Roles');

  api.addFiles('roles_server.js', 'server');
  api.addFiles('roles_common.js', both);
  api.addFiles(['client/debug.js',
                'client/uiHelpers.js',
                'client/subscriptions.js'], 'client');
});

Package.onTest(function (api) {
  api.versionsFrom("METEOR@1.8.1");

  var both = ['client', 'server'];

  // `accounts-password` is included so `Meteor.users` exists

  api.use(['alanning:roles',
           'accounts-password',
           'underscore',
           'tinytest'], both);

  api.addFiles('tests/client.js', 'client');
  api.addFiles('tests/server.js', 'server');
});
