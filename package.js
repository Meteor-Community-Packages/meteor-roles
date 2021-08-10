Package.describe({
  summary: "Authorization package for Meteor",
  version: "1.3.0",
  git: "https://github.com/Meteor-Community-Packages/meteor-roles.git",
  name: "alanning:roles"
});

Package.onUse(function (api) {
  api.versionsFrom("1.9");

  var both = ['client', 'server'];

  api.use(['underscore',
           'accounts-base@1.9.0 || 2.0.0',
           'tracker',
           'mongo',
           'check'], both);

  api.use(['blaze@2.5.0'], 'client', {weak: true});

  api.export('Roles');

  api.addFiles('roles/roles_server.js', 'server');
  api.addFiles('roles/roles_common.js', both);
  api.addFiles(['roles/client/debug.js',
                'roles/client/uiHelpers.js',
                'roles/client/subscriptions.js'], 'client');
});

Package.onTest(function (api) {
  api.versionsFrom("1.9");

  var both = ['client', 'server'];

  // `accounts-password` is included so `Meteor.users` exists

  api.use(['alanning:roles',
           'accounts-password@1.7.1 || 2.0.0',
           'underscore',
           'tinytest'], both);

  api.addFiles('roles/tests/client.js', 'client');
  api.addFiles('roles/tests/server.js', 'server');
});
