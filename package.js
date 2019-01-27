/* global Package, Npm */

Package.describe({
  summary: 'Authorization package for Meteor',
  version: '2.0.0-rc.1',
  git: 'https://github.com/alanning/meteor-roles.git',
  name: 'alanning:roles'
})

Package.onUse(function (api) {
  var both = ['client', 'server']

  api.versionsFrom('METEOR@1.6')

  api.use([
    'accounts-base',
    'tracker',
    'mongo',
    'check'
  ], both)

  api.use(['blaze'], 'client', { weak: true })

  api.export('Roles')

  api.addFiles('roles/roles_common.js', both)
  api.addFiles('roles/roles_server.js', 'server')
  api.addFiles([
    'roles/client/debug.js',
    'roles/client/uiHelpers.js',
    'roles/client/subscriptions.js'
  ], 'client')
})

Package.onTest(function (api) {
  // Add code coverage
  api.use([
    'lmieulet:meteor-packages-coverage@0.2.0',
    'lmieulet:meteor-coverage@3.0.0',
    'meteortesting:mocha'
  ])

  Npm.depends({
    'chai': '4.2.0'
  })

  api.versionsFrom('METEOR@1.6')

  var both = ['client', 'server']

  // `accounts-password` is included so `Meteor.users` exists

  api.use([
    'ecmascript',
    'alanning:roles',
    'accounts-password',
    'mongo',
    'tinytest'
  ], both)

  api.addFiles('roles/tests/client.js', 'client')
  api.addFiles('roles/tests/server.js', 'server')
})
