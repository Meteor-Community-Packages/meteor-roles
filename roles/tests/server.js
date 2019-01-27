/* global Meteor, Roles, Accounts, Tinytest */

;(function () {
  var users = {}
  var roles = ['admin', 'editor', 'user']

  Meteor.publish('_roleAssignments', function () {
    var loggedInUserId = this.userId

    if (!loggedInUserId) {
      this.ready()
      return
    }

    return Meteor.roleAssignment.find({ _id: loggedInUserId })
  })

  function addUser (name) {
    return Accounts.createUser({ 'username': name })
  }

  function reset () {
    Meteor.roles.remove({})
    Meteor.roleAssignment.remove({})
    Meteor.users.remove({})

    users = {
      'eve': addUser('eve'),
      'bob': addUser('bob'),
      'joe': addUser('joe')
    }
  }

  function testUser (test, username, expectedRoles, scope) {
    var userId = users[username]
    var userObj = Meteor.users.findOne({ _id: userId })

    // check using user ids (makes db calls)
    _innerTest(test, userId, username, expectedRoles, scope)

    // check using passed-in user object
    _innerTest(test, userObj, username, expectedRoles, scope)
  }

  function _innerTest (test, userParam, username, expectedRoles, scope) {
    // test that user has only the roles expected and no others
    roles.forEach(function (role) {
      var expected = expectedRoles.includes(role)
      var msg = username + ' expected to have \'' + role + '\' role but does not'
      var nmsg = username + ' had the following un-expected role: ' + role

      if (expected) {
        test.isTrue(Roles.userIsInRole(userParam, role, scope), msg)
      } else {
        test.isFalse(Roles.userIsInRole(userParam, role, scope), nmsg)
      }
    })
  }

  var deepEqual = function (x, y) {
    if (x === y) {
      return true
    } else if ((typeof x === 'object' && x != null) && (typeof y === 'object' && y != null)) {
      if (Object.keys(x).length !== Object.keys(y).length) {
        return false
      }

      for (var prop in x) {
        if (y.hasOwnProperty(prop)) {
          if (!deepEqual(x[prop], y[prop])) {
            return false
          }
        } else {
          return false
        }
      }

      return true
    } else {
      return false
    }
  }

  function itemsEqual (test, actual, expected) {
    actual = actual || []
    expected = expected || []

    function intersectionObjects (array, array2) {
      return array.filter(function (item) {
        return array2.some(function (item2) {
          return deepEqual(item, item2)
        })
      })
    }

    if (actual.length === expected.length && intersectionObjects(actual, expected).length === actual.length) {
      test.ok()
    } else {
      test.fail({
        type: 'itemsEqual',
        actual: JSON.stringify(actual),
        expected: JSON.stringify(expected)
      })
    }
  }

  Tinytest.add(
    'roles - can create and delete roles',
    function (test) {
      reset()

      var role1Id = Roles.createRole('test1')
      test.equal(Meteor.roles.findOne()._id, 'test1')
      test.equal(Meteor.roles.findOne(role1Id)._id, 'test1')

      var role2Id = Roles.createRole('test2')
      test.equal(Meteor.roles.findOne({ _id: 'test2' })._id, 'test2')
      test.equal(Meteor.roles.findOne(role2Id)._id, 'test2')

      test.equal(Meteor.roles.find().count(), 2)

      Roles.deleteRole('test1')
      test.equal(typeof Meteor.roles.findOne({ _id: 'test1' }), 'undefined')

      Roles.deleteRole('test2')
      test.equal(typeof Meteor.roles.findOne(), 'undefined')
    })

  Tinytest.add(
    'roles - can\'t create duplicate roles',
    function (test) {
      reset()

      Roles.createRole('test1')
      test.throws(function () { Roles.createRole('test1') })
      test.isNull(Roles.createRole('test1', { unlessExists: true }))
    })

  Tinytest.add(
    'roles - can\'t create role with empty names',
    function (test) {
      reset()

      test.throws(function () {
        Roles.createRole('')
      }, /Invalid role name/)
      test.throws(function () {
        Roles.createRole(null)
      }, /Invalid role name/)
      test.throws(function () {
        Roles.createRole(' ')
      }, /Invalid role name/)
      test.throws(function () {
        Roles.createRole(' foobar')
      }, /Invalid role name/)
      test.throws(function () {
        Roles.createRole(' foobar ')
      }, /Invalid role name/)
    })

  Tinytest.add(
    'roles - can\'t use invalid scope names',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')
      Roles.addUsersToRoles(users.eve, ['admin', 'user'], 'scope1')
      Roles.addUsersToRoles(users.eve, ['editor'], 'scope2')

      test.throws(function () {
        Roles.addUsersToRoles(users.eve, ['admin', 'user'], '')
      }, /Invalid scope name/)
      test.throws(function () {
        Roles.addUsersToRoles(users.eve, ['admin', 'user'], ' ')
      }, /Invalid scope name/)
      test.throws(function () {
        Roles.addUsersToRoles(users.eve, ['admin', 'user'], ' foobar')
      }, /Invalid scope name/)
      test.throws(function () {
        Roles.addUsersToRoles(users.eve, ['admin', 'user'], ' foobar ')
      }, /Invalid scope name/)
      test.throws(function () {
        Roles.addUsersToRoles(users.eve, ['admin', 'user'], 42)
      }, /Invalid scope name/)
    })

  Tinytest.add(
    'roles - can check if user is in role',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.addUsersToRoles(users.eve, ['admin', 'user'])

      testUser(test, 'eve', ['admin', 'user'])
    })

  Tinytest.add(
    'roles - can check if user is in role by scope',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')
      Roles.addUsersToRoles(users.eve, ['admin', 'user'], 'scope1')
      Roles.addUsersToRoles(users.eve, ['editor'], 'scope2')

      testUser(test, 'eve', ['admin', 'user'], 'scope1')
      testUser(test, 'eve', ['editor'], 'scope2')

      test.isFalse(Roles.userIsInRole(users.eve, ['admin', 'user'], 'scope2'))
      test.isFalse(Roles.userIsInRole(users.eve, ['editor'], 'scope1'))

      test.isTrue(Roles.userIsInRole(users.eve, ['admin', 'user'], { anyScope: true }))
      test.isTrue(Roles.userIsInRole(users.eve, ['editor'], { anyScope: true }))
    })

  Tinytest.add(
    'roles - can check if user is in role by scope through options',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')
      Roles.addUsersToRoles(users.eve, ['admin', 'user'], { scope: 'scope1' })
      Roles.addUsersToRoles(users.eve, ['editor'], { scope: 'scope2' })

      testUser(test, 'eve', ['admin', 'user'], { scope: 'scope1' })
      testUser(test, 'eve', ['editor'], { scope: 'scope2' })
    })

  Tinytest.add(
    'roles - can check if user is in role by scope with global role',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')
      Roles.addUsersToRoles(users.eve, ['admin', 'user'], 'scope1')
      Roles.addUsersToRoles(users.eve, ['editor'], 'scope2')
      Roles.addUsersToRoles(users.eve, ['admin'])

      test.isTrue(Roles.userIsInRole(users.eve, ['user'], 'scope1'))
      test.isTrue(Roles.userIsInRole(users.eve, ['editor'], 'scope2'))

      test.isFalse(Roles.userIsInRole(users.eve, ['user']))
      test.isFalse(Roles.userIsInRole(users.eve, ['editor']))
      test.isFalse(Roles.userIsInRole(users.eve, ['user'], null))
      test.isFalse(Roles.userIsInRole(users.eve, ['editor'], null))

      test.isFalse(Roles.userIsInRole(users.eve, ['user'], 'scope2'))
      test.isFalse(Roles.userIsInRole(users.eve, ['editor'], 'scope1'))

      test.isTrue(Roles.userIsInRole(users.eve, ['admin'], 'scope2'))
      test.isTrue(Roles.userIsInRole(users.eve, ['admin'], 'scope1'))
      test.isTrue(Roles.userIsInRole(users.eve, ['admin']))
      test.isTrue(Roles.userIsInRole(users.eve, ['admin'], null))
    })

  Tinytest.add(
    'roles - renaming scopes',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')
      Roles.addUsersToRoles(users.eve, ['admin', 'user'], 'scope1')
      Roles.addUsersToRoles(users.eve, ['editor'], 'scope2')

      testUser(test, 'eve', ['admin', 'user'], 'scope1')
      testUser(test, 'eve', ['editor'], 'scope2')

      Roles.renameScope('scope1', 'scope3')

      testUser(test, 'eve', ['admin', 'user'], 'scope3')
      testUser(test, 'eve', ['editor'], 'scope2')

      test.isFalse(Roles.userIsInRole(users.eve, ['admin', 'user'], 'scope1'))
      test.isFalse(Roles.userIsInRole(users.eve, ['admin', 'user'], 'scope2'))

      test.throws(function () {
        Roles.renameScope('scope3')
      }, /Invalid scope name/)

      Roles.renameScope('scope3', null)

      testUser(test, 'eve', ['admin', 'user', 'editor'], 'scope2')

      test.isFalse(Roles.userIsInRole(users.eve, ['editor']))
      test.isTrue(Roles.userIsInRole(users.eve, ['admin']))
      test.isTrue(Roles.userIsInRole(users.eve, ['user']))
      test.isFalse(Roles.userIsInRole(users.eve, ['editor'], null))
      test.isTrue(Roles.userIsInRole(users.eve, ['admin'], null))
      test.isTrue(Roles.userIsInRole(users.eve, ['user'], null))

      Roles.renameScope(null, 'scope2')

      testUser(test, 'eve', ['admin', 'user', 'editor'], 'scope2')

      test.isFalse(Roles.userIsInRole(users.eve, ['editor']))
      test.isFalse(Roles.userIsInRole(users.eve, ['admin']))
      test.isFalse(Roles.userIsInRole(users.eve, ['user']))
      test.isFalse(Roles.userIsInRole(users.eve, ['editor'], null))
      test.isFalse(Roles.userIsInRole(users.eve, ['admin'], null))
      test.isFalse(Roles.userIsInRole(users.eve, ['user'], null))
    })

  Tinytest.add(
    'roles - removing scopes',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')
      Roles.addUsersToRoles(users.eve, ['admin', 'user'], 'scope1')
      Roles.addUsersToRoles(users.eve, ['editor'], 'scope2')

      testUser(test, 'eve', ['admin', 'user'], 'scope1')
      testUser(test, 'eve', ['editor'], 'scope2')

      Roles.removeScope('scope1')

      testUser(test, 'eve', ['editor'], 'scope2')

      test.isFalse(Roles.userIsInRole(users.eve, ['admin', 'user'], 'scope1'))
      test.isFalse(Roles.userIsInRole(users.eve, ['admin', 'user'], 'scope2'))
    })

  Tinytest.add(
    'roles - can check if non-existant user is in role',
    function (test) {
      reset()

      test.isFalse(Roles.userIsInRole('1', 'admin'))
    })

  Tinytest.add(
    'roles - can check if null user is in role',
    function (test) {
      var user = null
      reset()

      test.isFalse(Roles.userIsInRole(user, 'admin'))
    })

  Tinytest.add(
    'roles - can check user against several roles at once',
    function (test) {
      var user
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')

      Roles.addUsersToRoles(users.eve, ['admin', 'user'])
      user = Meteor.users.findOne({ _id: users.eve })

      // we can check the non-existing role
      test.isTrue(Roles.userIsInRole(user, ['editor', 'admin']))
    })

  Tinytest.add(
    'roles - can\'t add non-existent user to role',
    function (test) {
      reset()

      Roles.createRole('admin')

      Roles.addUsersToRoles(['1'], ['admin'])
      test.equal(Meteor.users.findOne({ _id: '1' }), undefined)
    })

  Tinytest.add(
    'roles - can\'t add user to non-existent role',
    function (test) {
      reset()

      test.throws(function () {
        Roles.addUsersToRoles(users.eve, ['admin'])
      }, /Role 'admin' does not exist/)
      Roles.addUsersToRoles(users.eve, ['admin'], { ifExists: true })
    })

  Tinytest.add(
    'roles - can\'t set non-existent user to role',
    function (test) {
      reset()

      Roles.createRole('admin')

      Roles.setUserRoles(['1'], ['admin'])
      test.equal(Meteor.users.findOne({ _id: '1' }), undefined)
    })

  Tinytest.add(
    'roles - can\'t set user to non-existent role',
    function (test) {
      reset()

      test.throws(function () {
        Roles.setUserRoles(users.eve, ['admin'])
      }, /Role 'admin' does not exist/)
      Roles.setUserRoles(users.eve, ['admin'], { ifExists: true })
    })

  Tinytest.add(
    'roles - can add individual users to roles',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')

      Roles.addUsersToRoles(users.eve, ['admin', 'user'])

      testUser(test, 'eve', ['admin', 'user'])
      testUser(test, 'bob', [])
      testUser(test, 'joe', [])

      Roles.addUsersToRoles(users.joe, ['editor', 'user'])

      testUser(test, 'eve', ['admin', 'user'])
      testUser(test, 'bob', [])
      testUser(test, 'joe', ['editor', 'user'])
    })

  Tinytest.add(
    'roles - can add individual users to roles by scope',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')

      Roles.addUsersToRoles(users.eve, ['admin', 'user'], 'scope1')

      testUser(test, 'eve', ['admin', 'user'], 'scope1')
      testUser(test, 'bob', [], 'scope1')
      testUser(test, 'joe', [], 'scope1')

      testUser(test, 'eve', [], 'scope2')
      testUser(test, 'bob', [], 'scope2')
      testUser(test, 'joe', [], 'scope2')

      Roles.addUsersToRoles(users.joe, ['editor', 'user'], 'scope1')
      Roles.addUsersToRoles(users.bob, ['editor', 'user'], 'scope2')

      testUser(test, 'eve', ['admin', 'user'], 'scope1')
      testUser(test, 'bob', [], 'scope1')
      testUser(test, 'joe', ['editor', 'user'], 'scope1')

      testUser(test, 'eve', [], 'scope2')
      testUser(test, 'bob', ['editor', 'user'], 'scope2')
      testUser(test, 'joe', [], 'scope2')
    })

  Tinytest.add(
    'roles - can add user to roles via user object',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')

      var eve = Meteor.users.findOne({ _id: users.eve })
      var bob = Meteor.users.findOne({ _id: users.bob })

      Roles.addUsersToRoles(eve, ['admin', 'user'])

      testUser(test, 'eve', ['admin', 'user'])
      testUser(test, 'bob', [])
      testUser(test, 'joe', [])

      Roles.addUsersToRoles(bob, ['editor'])

      testUser(test, 'eve', ['admin', 'user'])
      testUser(test, 'bob', ['editor'])
      testUser(test, 'joe', [])
    })

  Tinytest.add(
    'roles - can add user to roles multiple times',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')

      Roles.addUsersToRoles(users.eve, ['admin', 'user'])
      Roles.addUsersToRoles(users.eve, ['admin', 'user'])

      testUser(test, 'eve', ['admin', 'user'])
      testUser(test, 'bob', [])
      testUser(test, 'joe', [])

      Roles.addUsersToRoles(users.bob, ['admin'])
      Roles.addUsersToRoles(users.bob, ['editor'])

      testUser(test, 'eve', ['admin', 'user'])
      testUser(test, 'bob', ['admin', 'editor'])
      testUser(test, 'joe', [])
    })

  Tinytest.add(
    'roles - can add user to roles multiple times by scope',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')

      Roles.addUsersToRoles(users.eve, ['admin', 'user'], 'scope1')
      Roles.addUsersToRoles(users.eve, ['admin', 'user'], 'scope1')

      testUser(test, 'eve', ['admin', 'user'], 'scope1')
      testUser(test, 'bob', [], 'scope1')
      testUser(test, 'joe', [], 'scope1')

      Roles.addUsersToRoles(users.bob, ['admin'], 'scope1')
      Roles.addUsersToRoles(users.bob, ['editor'], 'scope1')

      testUser(test, 'eve', ['admin', 'user'], 'scope1')
      testUser(test, 'bob', ['admin', 'editor'], 'scope1')
      testUser(test, 'joe', [], 'scope1')
    })

  Tinytest.add(
    'roles - can add multiple users to roles',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')

      Roles.addUsersToRoles([users.eve, users.bob], ['admin', 'user'])

      testUser(test, 'eve', ['admin', 'user'])
      testUser(test, 'bob', ['admin', 'user'])
      testUser(test, 'joe', [])

      Roles.addUsersToRoles([users.bob, users.joe], ['editor', 'user'])

      testUser(test, 'eve', ['admin', 'user'])
      testUser(test, 'bob', ['admin', 'editor', 'user'])
      testUser(test, 'joe', ['editor', 'user'])
    })

  Tinytest.add(
    'roles - can add multiple users to roles by scope',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')

      Roles.addUsersToRoles([users.eve, users.bob], ['admin', 'user'], 'scope1')

      testUser(test, 'eve', ['admin', 'user'], 'scope1')
      testUser(test, 'bob', ['admin', 'user'], 'scope1')
      testUser(test, 'joe', [], 'scope1')

      testUser(test, 'eve', [], 'scope2')
      testUser(test, 'bob', [], 'scope2')
      testUser(test, 'joe', [], 'scope2')

      Roles.addUsersToRoles([users.bob, users.joe], ['editor', 'user'], 'scope1')
      Roles.addUsersToRoles([users.bob, users.joe], ['editor', 'user'], 'scope2')

      testUser(test, 'eve', ['admin', 'user'], 'scope1')
      testUser(test, 'bob', ['admin', 'editor', 'user'], 'scope1')
      testUser(test, 'joe', ['editor', 'user'], 'scope1')

      testUser(test, 'eve', [], 'scope2')
      testUser(test, 'bob', ['editor', 'user'], 'scope2')
      testUser(test, 'joe', ['editor', 'user'], 'scope2')
    })

  Tinytest.add(
    'roles - can remove individual users from roles',
    function (test) {
      reset()

      Roles.createRole('user')
      Roles.createRole('editor')

      // remove user role - one user
      Roles.addUsersToRoles([users.eve, users.bob], ['editor', 'user'])
      testUser(test, 'eve', ['editor', 'user'])
      testUser(test, 'bob', ['editor', 'user'])
      Roles.removeUsersFromRoles(users.eve, ['user'])
      testUser(test, 'eve', ['editor'])
      testUser(test, 'bob', ['editor', 'user'])
    })

  Tinytest.add(
    'roles - can remove user from roles multiple times',
    function (test) {
      reset()

      Roles.createRole('user')
      Roles.createRole('editor')

      // remove user role - one user
      Roles.addUsersToRoles([users.eve, users.bob], ['editor', 'user'])
      testUser(test, 'eve', ['editor', 'user'])
      testUser(test, 'bob', ['editor', 'user'])
      Roles.removeUsersFromRoles(users.eve, ['user'])
      testUser(test, 'eve', ['editor'])
      testUser(test, 'bob', ['editor', 'user'])

      // try remove again
      Roles.removeUsersFromRoles(users.eve, ['user'])
      testUser(test, 'eve', ['editor'])
    })

  Tinytest.add(
    'roles - can remove users from roles via user object',
    function (test) {
      reset()

      Roles.createRole('user')
      Roles.createRole('editor')

      var eve = Meteor.users.findOne({ _id: users.eve })
      var bob = Meteor.users.findOne({ _id: users.bob })

      // remove user role - one user
      Roles.addUsersToRoles([eve, bob], ['editor', 'user'])
      testUser(test, 'eve', ['editor', 'user'])
      testUser(test, 'bob', ['editor', 'user'])
      Roles.removeUsersFromRoles(eve, ['user'])
      testUser(test, 'eve', ['editor'])
      testUser(test, 'bob', ['editor', 'user'])
    })

  Tinytest.add(
    'roles - can remove individual users from roles by scope',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')

      // remove user role - one user
      Roles.addUsersToRoles([users.eve, users.bob], ['editor', 'user'], 'scope1')
      Roles.addUsersToRoles([users.joe, users.bob], ['admin'], 'scope2')
      testUser(test, 'eve', ['editor', 'user'], 'scope1')
      testUser(test, 'bob', ['editor', 'user'], 'scope1')
      testUser(test, 'joe', [], 'scope1')
      testUser(test, 'eve', [], 'scope2')
      testUser(test, 'bob', ['admin'], 'scope2')
      testUser(test, 'joe', ['admin'], 'scope2')

      Roles.removeUsersFromRoles(users.eve, ['user'], 'scope1')
      testUser(test, 'eve', ['editor'], 'scope1')
      testUser(test, 'bob', ['editor', 'user'], 'scope1')
      testUser(test, 'joe', [], 'scope1')
      testUser(test, 'eve', [], 'scope2')
      testUser(test, 'bob', ['admin'], 'scope2')
      testUser(test, 'joe', ['admin'], 'scope2')
    })

  Tinytest.add(
    'roles - can remove individual users from roles by scope through options',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')

      // remove user role - one user
      Roles.addUsersToRoles([users.eve, users.bob], ['editor', 'user'], { scope: 'scope1' })
      Roles.addUsersToRoles([users.joe, users.bob], ['admin'], { scope: 'scope2' })
      testUser(test, 'eve', ['editor', 'user'], 'scope1')
      testUser(test, 'bob', ['editor', 'user'], 'scope1')
      testUser(test, 'joe', [], 'scope1')
      testUser(test, 'eve', [], 'scope2')
      testUser(test, 'bob', ['admin'], 'scope2')
      testUser(test, 'joe', ['admin'], 'scope2')

      Roles.removeUsersFromRoles(users.eve, ['user'], { scope: 'scope1' })
      testUser(test, 'eve', ['editor'], 'scope1')
      testUser(test, 'bob', ['editor', 'user'], 'scope1')
      testUser(test, 'joe', [], 'scope1')
      testUser(test, 'eve', [], 'scope2')
      testUser(test, 'bob', ['admin'], 'scope2')
      testUser(test, 'joe', ['admin'], 'scope2')
    })

  Tinytest.add(
    'roles - can remove multiple users from roles',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')

      // remove user role - two users
      Roles.addUsersToRoles([users.eve, users.bob], ['editor', 'user'])
      testUser(test, 'eve', ['editor', 'user'])
      testUser(test, 'bob', ['editor', 'user'])

      test.isFalse(Roles.userIsInRole(users.joe, 'admin'))
      Roles.addUsersToRoles([users.bob, users.joe], ['admin', 'user'])
      testUser(test, 'bob', ['admin', 'user', 'editor'])
      testUser(test, 'joe', ['admin', 'user'])
      Roles.removeUsersFromRoles([users.bob, users.joe], ['admin'])
      testUser(test, 'bob', ['user', 'editor'])
      testUser(test, 'joe', ['user'])
    })

  Tinytest.add(
    'roles - can remove multiple users from roles by scope',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')

      // remove user role - one user
      Roles.addUsersToRoles([users.eve, users.bob], ['editor', 'user'], 'scope1')
      Roles.addUsersToRoles([users.joe, users.bob], ['admin'], 'scope2')
      testUser(test, 'eve', ['editor', 'user'], 'scope1')
      testUser(test, 'bob', ['editor', 'user'], 'scope1')
      testUser(test, 'joe', [], 'scope1')
      testUser(test, 'eve', [], 'scope2')
      testUser(test, 'bob', ['admin'], 'scope2')
      testUser(test, 'joe', ['admin'], 'scope2')

      Roles.removeUsersFromRoles([users.eve, users.bob], ['user'], 'scope1')
      testUser(test, 'eve', ['editor'], 'scope1')
      testUser(test, 'bob', ['editor'], 'scope1')
      testUser(test, 'joe', [], 'scope1')
      testUser(test, 'eve', [], 'scope2')
      testUser(test, 'bob', ['admin'], 'scope2')
      testUser(test, 'joe', ['admin'], 'scope2')

      Roles.removeUsersFromRoles([users.joe, users.bob], ['admin'], 'scope2')
      testUser(test, 'eve', [], 'scope2')
      testUser(test, 'bob', [], 'scope2')
      testUser(test, 'joe', [], 'scope2')
    })

  Tinytest.add(
    'roles - can set user roles',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')

      var eve = Meteor.users.findOne({ _id: users.eve })
      var bob = Meteor.users.findOne({ _id: users.bob })

      Roles.setUserRoles([users.eve, bob], ['editor', 'user'])
      testUser(test, 'eve', ['editor', 'user'])
      testUser(test, 'bob', ['editor', 'user'])
      testUser(test, 'joe', [])

      // use addUsersToRoles add some roles
      Roles.addUsersToRoles([bob, users.joe], ['admin'])
      testUser(test, 'eve', ['editor', 'user'])
      testUser(test, 'bob', ['admin', 'editor', 'user'])
      testUser(test, 'joe', ['admin'])

      Roles.setUserRoles([eve, bob], ['user'])
      testUser(test, 'eve', ['user'])
      testUser(test, 'bob', ['user'])
      testUser(test, 'joe', ['admin'])

      Roles.setUserRoles(bob, 'editor')
      testUser(test, 'eve', ['user'])
      testUser(test, 'bob', ['editor'])
      testUser(test, 'joe', ['admin'])

      Roles.setUserRoles([users.joe, users.bob], [])
      testUser(test, 'eve', ['user'])
      testUser(test, 'bob', [])
      testUser(test, 'joe', [])
    })

  Tinytest.add(
    'roles - can set user roles by scope',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')

      var eve = Meteor.users.findOne({ _id: users.eve })
      var bob = Meteor.users.findOne({ _id: users.bob })
      var joe = Meteor.users.findOne({ _id: users.joe })

      Roles.setUserRoles([users.eve, users.bob], ['editor', 'user'], 'scope1')
      Roles.setUserRoles([users.bob, users.joe], ['admin'], 'scope2')
      testUser(test, 'eve', ['editor', 'user'], 'scope1')
      testUser(test, 'bob', ['editor', 'user'], 'scope1')
      testUser(test, 'joe', [], 'scope1')
      testUser(test, 'eve', [], 'scope2')
      testUser(test, 'bob', ['admin'], 'scope2')
      testUser(test, 'joe', ['admin'], 'scope2')

      // use addUsersToRoles add some roles
      Roles.addUsersToRoles([users.eve, users.bob], ['admin'], 'scope1')
      Roles.addUsersToRoles([users.bob, users.joe], ['editor'], 'scope2')
      testUser(test, 'eve', ['admin', 'editor', 'user'], 'scope1')
      testUser(test, 'bob', ['admin', 'editor', 'user'], 'scope1')
      testUser(test, 'joe', [], 'scope1')
      testUser(test, 'eve', [], 'scope2')
      testUser(test, 'bob', ['admin', 'editor'], 'scope2')
      testUser(test, 'joe', ['admin', 'editor'], 'scope2')

      Roles.setUserRoles([eve, bob], ['user'], 'scope1')
      Roles.setUserRoles([eve, joe], ['editor'], 'scope2')
      testUser(test, 'eve', ['user'], 'scope1')
      testUser(test, 'bob', ['user'], 'scope1')
      testUser(test, 'joe', [], 'scope1')
      testUser(test, 'eve', ['editor'], 'scope2')
      testUser(test, 'bob', ['admin', 'editor'], 'scope2')
      testUser(test, 'joe', ['editor'], 'scope2')

      Roles.setUserRoles(bob, 'editor', 'scope1')
      testUser(test, 'eve', ['user'], 'scope1')
      testUser(test, 'bob', ['editor'], 'scope1')
      testUser(test, 'joe', [], 'scope1')
      testUser(test, 'eve', ['editor'], 'scope2')
      testUser(test, 'bob', ['admin', 'editor'], 'scope2')
      testUser(test, 'joe', ['editor'], 'scope2')

      test.isTrue(Roles.getRolesForUser(users.bob, { anyScope: true, fullObjects: true }).map(r => r.scope).includes('scope1'))
      test.isFalse(Roles.getRolesForUser(users.joe, { anyScope: true, fullObjects: true }).map(r => r.scope).includes('scope1'))

      Roles.setUserRoles([bob, users.joe], [], 'scope1')
      testUser(test, 'eve', ['user'], 'scope1')
      testUser(test, 'bob', [], 'scope1')
      testUser(test, 'joe', [], 'scope1')
      testUser(test, 'eve', ['editor'], 'scope2')
      testUser(test, 'bob', ['admin', 'editor'], 'scope2')
      testUser(test, 'joe', ['editor'], 'scope2')

      // When roles in a given scope are removed, we do not want any dangling database content for that scope.
      test.isFalse(Roles.getRolesForUser(users.bob, { anyScope: true, fullObjects: true }).map(r => r.scope).includes('scope1'))
      test.isFalse(Roles.getRolesForUser(users.joe, { anyScope: true, fullObjects: true }).map(r => r.scope).includes('scope1'))
    })

  Tinytest.add(
    'roles - can set user roles by scope including GLOBAL_SCOPE',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('editor')

      var eve = Meteor.users.findOne({ _id: users.eve })

      Roles.addUsersToRoles(eve, 'admin', Roles.GLOBAL_SCOPE)
      testUser(test, 'eve', ['admin'], 'scope1')
      testUser(test, 'eve', ['admin'])

      Roles.setUserRoles(eve, 'editor', Roles.GLOBAL_SCOPE)
      testUser(test, 'eve', ['editor'], 'scope2')
      testUser(test, 'eve', ['editor'])
    })

  Tinytest.add(
    'roles - can get all roles',
    function (test) {
      reset()

      roles.forEach(function (role) {
        Roles.createRole(role)
      })

      // compare roles, sorted alphabetically
      var expected = roles
      var actual = Roles.getAllRoles().fetch().map(r => r._id)

      test.equal(actual, expected)

      test.equal(Roles.getAllRoles({ sort: { _id: -1 } }).fetch().map(r => r._id), expected.reverse())
    })

  Tinytest.add(
    'roles - can\'t get roles for non-existant user',
    function (test) {
      reset()
      test.equal(Roles.getRolesForUser('1'), [])
      test.equal(Roles.getRolesForUser('1', 'scope1'), [])
    })

  Tinytest.add(
    'roles - can get all roles for user',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')

      var userId = users.eve
      var userObj

      // by userId
      test.equal(Roles.getRolesForUser(userId), [])

      // by user object
      userObj = Meteor.users.findOne({ _id: userId })
      test.equal(Roles.getRolesForUser(userObj), [])

      Roles.addUsersToRoles(userId, ['admin', 'user'])

      // by userId
      test.equal(Roles.getRolesForUser(userId), ['admin', 'user'])

      // by user object
      userObj = Meteor.users.findOne({ _id: userId })
      test.equal(Roles.getRolesForUser(userObj), ['admin', 'user'])

      test.equal(Roles.getRolesForUser(userId, { fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'admin' },
        scope: null,
        user: { _id: userId },
        inheritedRoles: [{ _id: 'admin' }]
      }, {
        role: { _id: 'user' },
        scope: null,
        user: { _id: userId },
        inheritedRoles: [{ '_id': 'user' }]
      }])
    })

  Tinytest.add(
    'roles - can get all roles for user by scope',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')

      var userId = users.eve
      var userObj

      // by userId
      test.equal(Roles.getRolesForUser(userId, 'scope1'), [])

      // by user object
      userObj = Meteor.users.findOne({ _id: userId })
      test.equal(Roles.getRolesForUser(userObj, 'scope1'), [])

      // add roles
      Roles.addUsersToRoles(userId, ['admin', 'user'], 'scope1')
      Roles.addUsersToRoles(userId, ['admin'], 'scope2')

      // by userId
      test.equal(Roles.getRolesForUser(userId, 'scope1'), ['admin', 'user'])
      test.equal(Roles.getRolesForUser(userId, 'scope2'), ['admin'])
      test.equal(Roles.getRolesForUser(userId), [])

      // by user object
      userObj = Meteor.users.findOne({ _id: userId })
      test.equal(Roles.getRolesForUser(userObj, 'scope1'), ['admin', 'user'])
      test.equal(Roles.getRolesForUser(userObj, 'scope2'), ['admin'])
      test.equal(Roles.getRolesForUser(userObj), [])

      itemsEqual(test, Roles.getRolesForUser(userId, { fullObjects: true, scope: 'scope1' }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'admin' },
        scope: 'scope1',
        user: { _id: userId },
        inheritedRoles: [{ _id: 'admin' }]
      }, {
        role: { _id: 'user' },
        scope: 'scope1',
        user: { _id: userId },
        inheritedRoles: [{ _id: 'user' }]
      }])
      itemsEqual(test, Roles.getRolesForUser(userId, { fullObjects: true, scope: 'scope2' }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'admin' },
        scope: 'scope2',
        user: { _id: userId },
        inheritedRoles: [{ _id: 'admin' }]
      }])

      itemsEqual(test, Roles.getRolesForUser(userId, { fullObjects: true, anyScope: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'admin' },
        scope: 'scope1',
        user: { _id: userId },
        inheritedRoles: [{ _id: 'admin' }]
      }, {
        role: { _id: 'user' },
        scope: 'scope1',
        user: { _id: userId },
        inheritedRoles: [{ _id: 'user' }]
      }, {
        role: { _id: 'admin' },
        scope: 'scope2',
        user: { _id: userId },
        inheritedRoles: [{ _id: 'admin' }]
      }])

      Roles.createRole('PERMISSION')
      Roles.addRolesToParent('PERMISSION', 'user')

      itemsEqual(test, Roles.getRolesForUser(userId, { fullObjects: true, scope: 'scope1' }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'admin' },
        scope: 'scope1',
        user: { _id: userId },
        inheritedRoles: [{ _id: 'admin' }]
      }, {
        role: { _id: 'user' },
        scope: 'scope1',
        user: { _id: userId },
        inheritedRoles: [{ _id: 'user' }, { _id: 'PERMISSION' }]
      }])
      itemsEqual(test, Roles.getRolesForUser(userId, { fullObjects: true, scope: 'scope2' }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'admin' },
        scope: 'scope2',
        user: { _id: userId },
        inheritedRoles: [{ _id: 'admin' }]
      }])
      itemsEqual(test, Roles.getRolesForUser(userId, { scope: 'scope1' }), ['admin', 'user', 'PERMISSION'])
      itemsEqual(test, Roles.getRolesForUser(userId, { scope: 'scope2' }), ['admin'])

      itemsEqual(test, Roles.getRolesForUser(userId, { fullObjects: true, anyScope: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'admin' },
        scope: 'scope1',
        user: { _id: userId },
        inheritedRoles: [{ _id: 'admin' }]
      }, {
        role: { _id: 'user' },
        scope: 'scope1',
        user: { _id: userId },
        inheritedRoles: [{ _id: 'user' }, { _id: 'PERMISSION' }]
      }, {
        role: { _id: 'admin' },
        scope: 'scope2',
        user: { _id: userId },
        inheritedRoles: [{ _id: 'admin' }]
      }])
      itemsEqual(test, Roles.getRolesForUser(userId, { anyScope: true }), ['admin', 'user', 'PERMISSION'])

      itemsEqual(test, Roles.getRolesForUser(userId, { fullObjects: true, scope: 'scope1', onlyAssigned: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'admin' },
        scope: 'scope1',
        user: { _id: userId },
        inheritedRoles: [{ _id: 'admin' }]
      }, {
        role: { _id: 'user' },
        scope: 'scope1',
        user: { _id: userId },
        inheritedRoles: [{ _id: 'user' }, { _id: 'PERMISSION' }]
      }])
      itemsEqual(test, Roles.getRolesForUser(userId, { fullObjects: true, scope: 'scope2', onlyAssigned: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'admin' },
        scope: 'scope2',
        user: { _id: userId },
        inheritedRoles: [{ _id: 'admin' }]
      }])
      itemsEqual(test, Roles.getRolesForUser(userId, { scope: 'scope1', onlyAssigned: true }), ['admin', 'user'])
      itemsEqual(test, Roles.getRolesForUser(userId, { scope: 'scope2', onlyAssigned: true }), ['admin'])

      itemsEqual(test, Roles.getRolesForUser(userId, { fullObjects: true, anyScope: true, onlyAssigned: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'admin' },
        scope: 'scope1',
        user: { _id: userId },
        inheritedRoles: [{ _id: 'admin' }]
      }, {
        role: { _id: 'user' },
        scope: 'scope1',
        user: { _id: userId },
        inheritedRoles: [{ _id: 'user' }, { _id: 'PERMISSION' }]
      }, {
        role: { _id: 'admin' },
        scope: 'scope2',
        user: { _id: userId },
        inheritedRoles: [{ _id: 'admin' }]
      }])
      itemsEqual(test, Roles.getRolesForUser(userId, { anyScope: true, onlyAssigned: true }), ['admin', 'user'])
    })

  Tinytest.add(
    'roles - can get all roles for user by scope with periods in name',
    function (test) {
      reset()

      Roles.createRole('admin')

      Roles.addUsersToRoles(users.joe, ['admin'], 'example.k12.va.us')

      test.equal(Roles.getRolesForUser(users.joe, 'example.k12.va.us'), ['admin'])
    })

  Tinytest.add(
    'roles - can get all roles for user by scope including Roles.GLOBAL_SCOPE',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')

      var userId = users.eve
      var userObj

      Roles.addUsersToRoles([users.eve], ['editor'], Roles.GLOBAL_SCOPE)
      Roles.addUsersToRoles([users.eve], ['admin', 'user'], 'scope1')

      // by userId
      itemsEqual(test, Roles.getRolesForUser(userId, 'scope1'), ['editor', 'admin', 'user'])
      itemsEqual(test, Roles.getRolesForUser(userId), ['editor'])

      // by user object
      userObj = Meteor.users.findOne({ _id: userId })
      itemsEqual(test, Roles.getRolesForUser(userObj, 'scope1'), ['editor', 'admin', 'user'])
      itemsEqual(test, Roles.getRolesForUser(userObj), ['editor'])
    })

  Tinytest.add(
    'roles - getRolesForUser should not return null entries if user has no roles for scope',
    function (test) {
      reset()

      Roles.createRole('editor')

      var userId = users.eve
      var userObj

      // by userId
      itemsEqual(test, Roles.getRolesForUser(userId, 'scope1'), [])
      itemsEqual(test, Roles.getRolesForUser(userId), [])

      // by user object
      userObj = Meteor.users.findOne({ _id: userId })
      itemsEqual(test, Roles.getRolesForUser(userObj, 'scope1'), [])
      itemsEqual(test, Roles.getRolesForUser(userObj), [])

      Roles.addUsersToRoles([users.eve], ['editor'], Roles.GLOBAL_SCOPE)

      // by userId
      itemsEqual(test, Roles.getRolesForUser(userId, 'scope1'), ['editor'])
      itemsEqual(test, Roles.getRolesForUser(userId), ['editor'])

      // by user object
      userObj = Meteor.users.findOne({ _id: userId })
      itemsEqual(test, Roles.getRolesForUser(userObj, 'scope1'), ['editor'])
      itemsEqual(test, Roles.getRolesForUser(userObj), ['editor'])
    })

  Tinytest.add(
    'roles - can get all scopes for user',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')

      var userId = users.eve
      var userObj

      Roles.addUsersToRoles([users.eve], ['editor'], 'scope1')
      Roles.addUsersToRoles([users.eve], ['admin', 'user'], 'scope2')

      // by userId
      itemsEqual(test, Roles.getScopesForUser(userId), ['scope1', 'scope2'])

      // by user object
      userObj = Meteor.users.findOne({ _id: userId })
      itemsEqual(test, Roles.getScopesForUser(userObj), ['scope1', 'scope2'])
    })

  Tinytest.add(
    'roles - can get all scopes for user by role',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')

      var userId = users.eve
      var userObj

      Roles.addUsersToRoles([users.eve], ['editor'], 'scope1')
      Roles.addUsersToRoles([users.eve], ['editor', 'user'], 'scope2')

      // by userId
      itemsEqual(test, Roles.getScopesForUser(userId, 'user'), ['scope2'])
      itemsEqual(test, Roles.getScopesForUser(userId, 'editor'), ['scope1', 'scope2'])
      itemsEqual(test, Roles.getScopesForUser(userId, 'admin'), [])

      // by user object
      userObj = Meteor.users.findOne({ _id: userId })
      itemsEqual(test, Roles.getScopesForUser(userObj, 'user'), ['scope2'])
      itemsEqual(test, Roles.getScopesForUser(userObj, 'editor'), ['scope1', 'scope2'])
      itemsEqual(test, Roles.getScopesForUser(userObj, 'admin'), [])
    })

  Tinytest.add(
    'roles - getScopesForUser returns [] when not using scopes',
    function (test) {
      reset()

      Roles.createRole('user')
      Roles.createRole('editor')

      var userId = users.eve
      var userObj

      Roles.addUsersToRoles([users.eve], ['editor', 'user'])

      // by userId
      itemsEqual(test, Roles.getScopesForUser(userId), [])
      itemsEqual(test, Roles.getScopesForUser(userId, 'editor'), [])
      itemsEqual(test, Roles.getScopesForUser(userId, ['editor']), [])
      itemsEqual(test, Roles.getScopesForUser(userId, ['editor', 'user']), [])

      // by user object
      userObj = Meteor.users.findOne({ _id: userId })
      itemsEqual(test, Roles.getScopesForUser(userObj), [])
      itemsEqual(test, Roles.getScopesForUser(userObj, 'editor'), [])
      itemsEqual(test, Roles.getScopesForUser(userObj, ['editor']), [])
      itemsEqual(test, Roles.getScopesForUser(userObj, ['editor', 'user']), [])
    })

  Tinytest.add(
    'roles - can get all groups for user by role array',
    function (test) {
      reset()

      var userId = users.eve
      var userObj

      Roles.createRole('user')
      Roles.createRole('editor')
      Roles.createRole('moderator')
      Roles.createRole('admin')

      Roles.addUsersToRoles([users.eve], ['editor'], 'group1')
      Roles.addUsersToRoles([users.eve], ['editor', 'user'], 'group2')
      Roles.addUsersToRoles([users.eve], ['moderator'], 'group3')

      // by userId, one role
      itemsEqual(test, Roles.getScopesForUser(userId, ['user']), ['group2'])
      itemsEqual(test, Roles.getScopesForUser(userId, ['editor']), ['group1', 'group2'])
      itemsEqual(test, Roles.getScopesForUser(userId, ['admin']), [])

      // by userId, multiple roles
      itemsEqual(test, Roles.getScopesForUser(userId, ['editor', 'user']), ['group1', 'group2'])
      itemsEqual(test, Roles.getScopesForUser(userId, ['editor', 'moderator']), ['group1', 'group2', 'group3'])
      itemsEqual(test, Roles.getScopesForUser(userId, ['user', 'moderator']), ['group2', 'group3'])

      // by user object, one role
      userObj = Meteor.users.findOne({ _id: userId })
      itemsEqual(test, Roles.getScopesForUser(userObj, ['user']), ['group2'])
      itemsEqual(test, Roles.getScopesForUser(userObj, ['editor']), ['group1', 'group2'])
      itemsEqual(test, Roles.getScopesForUser(userObj, ['admin']), [])

      // by user object, multiple roles
      itemsEqual(test, Roles.getScopesForUser(userObj, ['editor', 'user']), ['group1', 'group2'])
      itemsEqual(test, Roles.getScopesForUser(userObj, ['editor', 'moderator']), ['group1', 'group2', 'group3'])
      itemsEqual(test, Roles.getScopesForUser(userObj, ['user', 'moderator']), ['group2', 'group3'])
    })

  Tinytest.add(
    'roles - getting all scopes for user does not include GLOBAL_SCOPE',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')

      var userId = users.eve
      var userObj

      Roles.addUsersToRoles([users.eve], ['editor'], 'scope1')
      Roles.addUsersToRoles([users.eve], ['editor', 'user'], 'scope2')
      Roles.addUsersToRoles([users.eve], ['editor', 'user', 'admin'], Roles.GLOBAL_SCOPE)

      // by userId
      itemsEqual(test, Roles.getScopesForUser(userId, 'user'), ['scope2'])
      itemsEqual(test, Roles.getScopesForUser(userId, 'editor'), ['scope1', 'scope2'])
      itemsEqual(test, Roles.getScopesForUser(userId, 'admin'), [])
      itemsEqual(test, Roles.getScopesForUser(userId, ['user']), ['scope2'])
      itemsEqual(test, Roles.getScopesForUser(userId, ['editor']), ['scope1', 'scope2'])
      itemsEqual(test, Roles.getScopesForUser(userId, ['admin']), [])
      itemsEqual(test, Roles.getScopesForUser(userId, ['user', 'editor', 'admin']), ['scope1', 'scope2'])

      // by user object
      userObj = Meteor.users.findOne({ _id: userId })
      itemsEqual(test, Roles.getScopesForUser(userObj, 'user'), ['scope2'])
      itemsEqual(test, Roles.getScopesForUser(userObj, 'editor'), ['scope1', 'scope2'])
      itemsEqual(test, Roles.getScopesForUser(userObj, 'admin'), [])
      itemsEqual(test, Roles.getScopesForUser(userObj, ['user']), ['scope2'])
      itemsEqual(test, Roles.getScopesForUser(userObj, ['editor']), ['scope1', 'scope2'])
      itemsEqual(test, Roles.getScopesForUser(userObj, ['admin']), [])
      itemsEqual(test, Roles.getScopesForUser(userObj, ['user', 'editor', 'admin']), ['scope1', 'scope2'])
    })

  Tinytest.add(
    'roles - can get all users in role',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')

      Roles.addUsersToRoles([users.eve, users.joe], ['admin', 'user'])
      Roles.addUsersToRoles([users.bob, users.joe], ['editor'])

      var expected = [users.eve, users.joe]
      var actual = Roles.getUsersInRole('admin').fetch().map(r => r._id)

      itemsEqual(test, actual, expected)
    })

  Tinytest.add(
    'roles - can get all users in role by scope',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')

      Roles.addUsersToRoles([users.eve, users.joe], ['admin', 'user'], 'scope1')
      Roles.addUsersToRoles([users.bob, users.joe], ['admin'], 'scope2')

      var expected = [users.eve, users.joe]
      var actual = Roles.getUsersInRole('admin', 'scope1').fetch().map(r => r._id)

      itemsEqual(test, actual, expected)

      expected = [users.eve, users.joe]
      actual = Roles.getUsersInRole('admin', { scope: 'scope1' }).fetch().map(r => r._id)
      itemsEqual(test, actual, expected)

      expected = [users.eve, users.bob, users.joe]
      actual = Roles.getUsersInRole('admin', { anyScope: true }).fetch().map(r => r._id)
      itemsEqual(test, actual, expected)

      actual = Roles.getUsersInRole('admin').fetch().map(r => r._id)
      itemsEqual(test, actual, [])
    })

  Tinytest.add(
    'roles - can get all users in role by scope including Roles.GLOBAL_SCOPE',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')

      Roles.addUsersToRoles([users.eve], ['admin', 'user'], Roles.GLOBAL_SCOPE)
      Roles.addUsersToRoles([users.bob, users.joe], ['admin'], 'scope2')

      var expected = [users.eve]
      var actual = Roles.getUsersInRole('admin', 'scope1').fetch().map(r => r._id)

      itemsEqual(test, actual, expected)

      expected = [users.eve, users.bob, users.joe]
      actual = Roles.getUsersInRole('admin', 'scope2').fetch().map(r => r._id)

      itemsEqual(test, actual, expected)

      expected = [users.eve]
      actual = Roles.getUsersInRole('admin').fetch().map(r => r._id)

      itemsEqual(test, actual, expected)

      expected = [users.eve, users.bob, users.joe]
      actual = Roles.getUsersInRole('admin', { anyScope: true }).fetch().map(r => r._id)

      itemsEqual(test, actual, expected)
    })

  Tinytest.add(
    'roles - can get all users in role by scope and passes through mongo query arguments',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')

      Roles.addUsersToRoles([users.eve, users.joe], ['admin', 'user'], 'scope1')
      Roles.addUsersToRoles([users.bob, users.joe], ['admin'], 'scope2')

      var results = Roles.getUsersInRole('admin', 'scope1', { fields: { username: 0 }, limit: 1 }).fetch()

      test.equal(1, results.length)
      test.isTrue(results[0].hasOwnProperty('_id'))
      test.isFalse(results[0].hasOwnProperty('username'))
    })

  Tinytest.add(
    'roles - can use Roles.GLOBAL_SCOPE to assign blanket roles',
    function (test) {
      reset()

      Roles.createRole('admin')

      Roles.addUsersToRoles([users.joe, users.bob], ['admin'], Roles.GLOBAL_SCOPE)

      testUser(test, 'eve', [], 'scope1')
      testUser(test, 'joe', ['admin'], 'scope2')
      testUser(test, 'joe', ['admin'], 'scope1')
      testUser(test, 'bob', ['admin'], 'scope2')
      testUser(test, 'bob', ['admin'], 'scope1')

      Roles.removeUsersFromRoles(users.joe, ['admin'], Roles.GLOBAL_SCOPE)

      testUser(test, 'eve', [], 'scope1')
      testUser(test, 'joe', [], 'scope2')
      testUser(test, 'joe', [], 'scope1')
      testUser(test, 'bob', ['admin'], 'scope2')
      testUser(test, 'bob', ['admin'], 'scope1')
    })

  Tinytest.add(
    'roles - Roles.GLOBAL_SCOPE is independent of other scopes',
    function (test) {
      reset()

      Roles.createRole('admin')

      Roles.addUsersToRoles([users.joe, users.bob], ['admin'], 'scope5')
      Roles.addUsersToRoles([users.joe, users.bob], ['admin'], Roles.GLOBAL_SCOPE)

      testUser(test, 'eve', [], 'scope1')
      testUser(test, 'joe', ['admin'], 'scope5')
      testUser(test, 'joe', ['admin'], 'scope2')
      testUser(test, 'joe', ['admin'], 'scope1')
      testUser(test, 'bob', ['admin'], 'scope5')
      testUser(test, 'bob', ['admin'], 'scope2')
      testUser(test, 'bob', ['admin'], 'scope1')

      Roles.removeUsersFromRoles(users.joe, ['admin'], Roles.GLOBAL_SCOPE)

      testUser(test, 'eve', [], 'scope1')
      testUser(test, 'joe', ['admin'], 'scope5')
      testUser(test, 'joe', [], 'scope2')
      testUser(test, 'joe', [], 'scope1')
      testUser(test, 'bob', ['admin'], 'scope5')
      testUser(test, 'bob', ['admin'], 'scope2')
      testUser(test, 'bob', ['admin'], 'scope1')
    })

  Tinytest.add(
    'roles - Roles.GLOBAL_SCOPE also checked when scope not specified',
    function (test) {
      reset()

      Roles.createRole('admin')

      Roles.addUsersToRoles(users.joe, 'admin', Roles.GLOBAL_SCOPE)

      testUser(test, 'joe', ['admin'])

      Roles.removeUsersFromRoles(users.joe, 'admin', Roles.GLOBAL_SCOPE)

      testUser(test, 'joe', [])
    })

  Tinytest.add(
    'roles - can use \'.\' in scope name',
    function (test) {
      reset()

      Roles.createRole('admin')

      Roles.addUsersToRoles(users.joe, ['admin'], 'example.com')
      testUser(test, 'joe', ['admin'], 'example.com')
    })

  Tinytest.add(
    'roles - can use multiple periods in scope name',
    function (test) {
      reset()

      Roles.createRole('admin')

      Roles.addUsersToRoles(users.joe, ['admin'], 'example.k12.va.us')
      testUser(test, 'joe', ['admin'], 'example.k12.va.us')
    })

  Tinytest.add(
    'roles - renaming of roles',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')

      Roles.setUserRoles([users.eve, users.bob], ['editor', 'user'], 'scope1')
      Roles.setUserRoles([users.bob, users.joe], ['user', 'admin'], 'scope2')

      test.isTrue(Roles.userIsInRole(users.eve, 'editor', 'scope1'))
      test.isFalse(Roles.userIsInRole(users.eve, 'editor', 'scope2'))

      test.isFalse(Roles.userIsInRole(users.joe, 'admin', 'scope1'))
      test.isTrue(Roles.userIsInRole(users.joe, 'admin', 'scope2'))

      test.isTrue(Roles.userIsInRole(users.eve, 'user', 'scope1'))
      test.isTrue(Roles.userIsInRole(users.bob, 'user', 'scope1'))
      test.isFalse(Roles.userIsInRole(users.joe, 'user', 'scope1'))

      test.isFalse(Roles.userIsInRole(users.eve, 'user', 'scope2'))
      test.isTrue(Roles.userIsInRole(users.bob, 'user', 'scope2'))
      test.isTrue(Roles.userIsInRole(users.joe, 'user', 'scope2'))

      test.isFalse(Roles.userIsInRole(users.eve, 'user2', 'scope1'))
      test.isFalse(Roles.userIsInRole(users.eve, 'user2', 'scope2'))

      Roles.renameRole('user', 'user2')

      test.isTrue(Roles.userIsInRole(users.eve, 'editor', 'scope1'))
      test.isFalse(Roles.userIsInRole(users.eve, 'editor', 'scope2'))

      test.isFalse(Roles.userIsInRole(users.joe, 'admin', 'scope1'))
      test.isTrue(Roles.userIsInRole(users.joe, 'admin', 'scope2'))

      test.isTrue(Roles.userIsInRole(users.eve, 'user2', 'scope1'))
      test.isTrue(Roles.userIsInRole(users.bob, 'user2', 'scope1'))
      test.isFalse(Roles.userIsInRole(users.joe, 'user2', 'scope1'))

      test.isFalse(Roles.userIsInRole(users.eve, 'user2', 'scope2'))
      test.isTrue(Roles.userIsInRole(users.bob, 'user2', 'scope2'))
      test.isTrue(Roles.userIsInRole(users.joe, 'user2', 'scope2'))

      test.isFalse(Roles.userIsInRole(users.eve, 'user', 'scope1'))
      test.isFalse(Roles.userIsInRole(users.eve, 'user', 'scope2'))
    })

  Tinytest.add(
    'roles - migration without global groups',
    function (test) {
      reset()

      test.isTrue(Meteor.roles.insert({ name: 'admin' }))
      test.isTrue(Meteor.roles.insert({ name: 'editor' }))
      test.isTrue(Meteor.roles.insert({ name: 'user' }))

      test.isTrue(Meteor.users.update(users.eve, { $set: { roles: ['admin', 'editor'] } }))
      test.isTrue(Meteor.users.update(users.bob, { $set: { roles: [] } }))
      test.isTrue(Meteor.users.update(users.joe, { $set: { roles: ['user'] } }))

      Roles._forwardMigrate()

      test.equal(Meteor.users.findOne(users.eve, { fields: { roles: 1, _id: 0 } }), {
        roles: [{
          _id: 'admin',
          scope: null,
          assigned: true
        }, {
          _id: 'editor',
          scope: null,
          assigned: true
        }]
      })
      test.equal(Meteor.users.findOne(users.bob, { fields: { roles: 1, _id: 0 } }), {
        roles: []
      })
      test.equal(Meteor.users.findOne(users.joe, { fields: { roles: 1, _id: 0 } }), {
        roles: [{
          _id: 'user',
          scope: null,
          assigned: true
        }]
      })

      test.equal(Meteor.roles.findOne({ _id: 'admin' }), {
        _id: 'admin',
        children: []
      })
      test.equal(Meteor.roles.findOne({ _id: 'editor' }), {
        _id: 'editor',
        children: []
      })
      test.equal(Meteor.roles.findOne({ _id: 'user' }), {
        _id: 'user',
        children: []
      })

      Roles._backwardMigrate(null, null, false)

      test.equal(Meteor.users.findOne(users.eve, { fields: { roles: 1, _id: 0 } }), {
        roles: ['admin', 'editor']
      })
      test.equal(Meteor.users.findOne(users.bob, { fields: { roles: 1, _id: 0 } }), {
        roles: []
      })
      test.equal(Meteor.users.findOne(users.joe, { fields: { roles: 1, _id: 0 } }), {
        roles: ['user']
      })

      test.equal(Meteor.roles.findOne({ name: 'admin' }, { fields: { _id: 0 } }), {
        name: 'admin'
      })
      test.equal(Meteor.roles.findOne({ name: 'editor' }, { fields: { _id: 0 } }), {
        name: 'editor'
      })
      test.equal(Meteor.roles.findOne({ name: 'user' }, { fields: { _id: 0 } }), {
        name: 'user'
      })
    })

  Tinytest.add(
    'roles - migration with global groups',
    function (test) {
      reset()

      test.isTrue(Meteor.roles.insert({ name: 'admin' }))
      test.isTrue(Meteor.roles.insert({ name: 'editor' }))
      test.isTrue(Meteor.roles.insert({ name: 'user' }))

      test.isTrue(Meteor.users.update(users.eve, { $set: { roles: { __global_roles__: ['admin', 'editor'], foo_bla: ['user'] } } }))
      test.isTrue(Meteor.users.update(users.bob, { $set: { roles: { } } }))
      test.isTrue(Meteor.users.update(users.joe, { $set: { roles: { __global_roles__: ['user'], foo_bla: ['user'] } } }))

      Roles._forwardMigrate(null, null, false)

      test.equal(Meteor.users.findOne(users.eve, { fields: { roles: 1, _id: 0 } }), {
        roles: [{
          _id: 'admin',
          scope: null,
          assigned: true
        }, {
          _id: 'editor',
          scope: null,
          assigned: true
        }, {
          _id: 'user',
          scope: 'foo_bla',
          assigned: true
        }]
      })
      test.equal(Meteor.users.findOne(users.bob, { fields: { roles: 1, _id: 0 } }), {
        roles: []
      })
      test.equal(Meteor.users.findOne(users.joe, { fields: { roles: 1, _id: 0 } }), {
        roles: [{
          _id: 'user',
          scope: null,
          assigned: true
        }, {
          _id: 'user',
          scope: 'foo_bla',
          assigned: true
        }]
      })

      test.equal(Meteor.roles.findOne({ _id: 'admin' }), {
        _id: 'admin',
        children: []
      })
      test.equal(Meteor.roles.findOne({ _id: 'editor' }), {
        _id: 'editor',
        children: []
      })
      test.equal(Meteor.roles.findOne({ _id: 'user' }), {
        _id: 'user',
        children: []
      })

      Roles._backwardMigrate(null, null, true)

      test.equal(Meteor.users.findOne(users.eve, { fields: { roles: 1, _id: 0 } }), {
        roles: {
          __global_roles__: ['admin', 'editor'],
          foo_bla: ['user']
        }
      })
      test.equal(Meteor.users.findOne(users.bob, { fields: { roles: 1, _id: 0 } }), {
        roles: {}
      })
      test.equal(Meteor.users.findOne(users.joe, { fields: { roles: 1, _id: 0 } }), {
        roles: {
          __global_roles__: ['user'],
          foo_bla: ['user']
        }
      })

      test.equal(Meteor.roles.findOne({ name: 'admin' }, { fields: { _id: 0 } }), {
        name: 'admin'
      })
      test.equal(Meteor.roles.findOne({ name: 'editor' }, { fields: { _id: 0 } }), {
        name: 'editor'
      })
      test.equal(Meteor.roles.findOne({ name: 'user' }, { fields: { _id: 0 } }), {
        name: 'user'
      })

      Roles._forwardMigrate(null, null, true)

      test.equal(Meteor.users.findOne(users.eve, { fields: { roles: 1, _id: 0 } }), {
        roles: [{
          _id: 'admin',
          scope: null,
          assigned: true
        }, {
          _id: 'editor',
          scope: null,
          assigned: true
        }, {
          _id: 'user',
          scope: 'foo.bla',
          assigned: true
        }]
      })
      test.equal(Meteor.users.findOne(users.bob, { fields: { roles: 1, _id: 0 } }), {
        roles: []
      })
      test.equal(Meteor.users.findOne(users.joe, { fields: { roles: 1, _id: 0 } }), {
        roles: [{
          _id: 'user',
          scope: null,
          assigned: true
        }, {
          _id: 'user',
          scope: 'foo.bla',
          assigned: true
        }]
      })

      test.equal(Meteor.roles.findOne({ _id: 'admin' }), {
        _id: 'admin',
        children: []
      })
      test.equal(Meteor.roles.findOne({ _id: 'editor' }), {
        _id: 'editor',
        children: []
      })
      test.equal(Meteor.roles.findOne({ _id: 'user' }), {
        _id: 'user',
        children: []
      })
    })

  Tinytest.add(
    'roles - _addUserToRole',
    function (test) {
      reset()

      Roles.createRole('admin')

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [])

      Roles._addUserToRole(users.eve, 'admin', { scope: null, ifExists: false })

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'admin' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [{ _id: 'admin' }]
      }])
    })

  Tinytest.add(
    'roles - _removeUserFromRole',
    function (test) {
      reset()

      Roles.createRole('admin')

      Roles.addUsersToRoles(users.eve, 'admin')

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'admin' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [{ _id: 'admin' }]
      }])

      Roles._removeUserFromRole(users.eve, 'admin', { scope: null })

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [])
    })

  Tinytest.add(
    'roles - keep assigned roles',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('ALL_PERMISSIONS')
      Roles.createRole('VIEW_PERMISSION')
      Roles.createRole('EDIT_PERMISSION')
      Roles.createRole('DELETE_PERMISSION')
      Roles.addRolesToParent('ALL_PERMISSIONS', 'user')
      Roles.addRolesToParent('EDIT_PERMISSION', 'ALL_PERMISSIONS')
      Roles.addRolesToParent('VIEW_PERMISSION', 'ALL_PERMISSIONS')
      Roles.addRolesToParent('DELETE_PERMISSION', 'admin')

      Roles.addUsersToRoles(users.eve, ['user'])

      test.isTrue(Roles.userIsInRole(users.eve, 'VIEW_PERMISSION'))

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'user' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'user' },
          { _id: 'ALL_PERMISSIONS' },
          { _id: 'EDIT_PERMISSION' },
          { _id: 'VIEW_PERMISSION' }
        ]
      }])

      Roles.addUsersToRoles(users.eve, 'VIEW_PERMISSION')

      test.isTrue(Roles.userIsInRole(users.eve, 'VIEW_PERMISSION'))

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'user' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'user' },
          { _id: 'ALL_PERMISSIONS' },
          { _id: 'EDIT_PERMISSION' },
          { _id: 'VIEW_PERMISSION' }
        ]
      }, {
        role: { _id: 'VIEW_PERMISSION' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'VIEW_PERMISSION' }
        ]
      }])

      Roles.removeUsersFromRoles(users.eve, 'user')

      test.isTrue(Roles.userIsInRole(users.eve, 'VIEW_PERMISSION'))

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'VIEW_PERMISSION' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'VIEW_PERMISSION' }
        ]
      }])

      Roles.removeUsersFromRoles(users.eve, 'VIEW_PERMISSION')

      test.isFalse(Roles.userIsInRole(users.eve, 'VIEW_PERMISSION'))

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [])
    })

  Tinytest.add(
    'roles - modify assigned hierarchical roles',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('ALL_PERMISSIONS')
      Roles.createRole('VIEW_PERMISSION')
      Roles.createRole('EDIT_PERMISSION')
      Roles.createRole('DELETE_PERMISSION')
      Roles.addRolesToParent('ALL_PERMISSIONS', 'user')
      Roles.addRolesToParent('EDIT_PERMISSION', 'ALL_PERMISSIONS')
      Roles.addRolesToParent('VIEW_PERMISSION', 'ALL_PERMISSIONS')
      Roles.addRolesToParent('DELETE_PERMISSION', 'admin')

      Roles.addUsersToRoles(users.eve, ['user'])
      Roles.addUsersToRoles(users.eve, ['ALL_PERMISSIONS'], 'scope')

      test.isFalse(Roles.userIsInRole(users.eve, 'MODERATE_PERMISSION'))
      test.isFalse(Roles.userIsInRole(users.eve, 'MODERATE_PERMISSION', 'scope'))

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'user' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'user' },
          { _id: 'ALL_PERMISSIONS' },
          { _id: 'EDIT_PERMISSION' },
          { _id: 'VIEW_PERMISSION' }
        ]
      }, {
        role: { _id: 'ALL_PERMISSIONS' },
        scope: 'scope',
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'ALL_PERMISSIONS' },
          { _id: 'EDIT_PERMISSION' },
          { _id: 'VIEW_PERMISSION' }
        ]
      }])

      Roles.createRole('MODERATE_PERMISSION')

      Roles.addRolesToParent('MODERATE_PERMISSION', 'ALL_PERMISSIONS')

      test.isTrue(Roles.userIsInRole(users.eve, 'MODERATE_PERMISSION'))
      test.isTrue(Roles.userIsInRole(users.eve, 'MODERATE_PERMISSION', 'scope'))

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'user' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'user' },
          { _id: 'ALL_PERMISSIONS' },
          { _id: 'EDIT_PERMISSION' },
          { _id: 'VIEW_PERMISSION' },
          { _id: 'MODERATE_PERMISSION' }
        ]
      }, {
        role: { _id: 'ALL_PERMISSIONS' },
        scope: 'scope',
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'ALL_PERMISSIONS' },
          { _id: 'EDIT_PERMISSION' },
          { _id: 'VIEW_PERMISSION' },
          { _id: 'MODERATE_PERMISSION' }
        ]
      }])

      Roles.addUsersToRoles(users.eve, ['admin'])

      test.isTrue(Roles.userIsInRole(users.eve, 'DELETE_PERMISSION'))
      test.isTrue(Roles.userIsInRole(users.eve, 'DELETE_PERMISSION', 'scope'))

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'user' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'user' },
          { _id: 'ALL_PERMISSIONS' },
          { _id: 'EDIT_PERMISSION' },
          { _id: 'VIEW_PERMISSION' },
          { _id: 'MODERATE_PERMISSION' }
        ]
      }, {
        role: { _id: 'ALL_PERMISSIONS' },
        scope: 'scope',
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'ALL_PERMISSIONS' },
          { _id: 'EDIT_PERMISSION' },
          { _id: 'VIEW_PERMISSION' },
          { _id: 'MODERATE_PERMISSION' }
        ]
      }, {
        role: { _id: 'admin' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'admin' },
          { _id: 'DELETE_PERMISSION' }
        ]
      }])

      Roles.addRolesToParent('DELETE_PERMISSION', 'ALL_PERMISSIONS')

      test.isTrue(Roles.userIsInRole(users.eve, 'DELETE_PERMISSION'))
      test.isTrue(Roles.userIsInRole(users.eve, 'DELETE_PERMISSION', 'scope'))

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'user' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'user' },
          { _id: 'ALL_PERMISSIONS' },
          { _id: 'EDIT_PERMISSION' },
          { _id: 'VIEW_PERMISSION' },
          { _id: 'MODERATE_PERMISSION' },
          { _id: 'DELETE_PERMISSION' }
        ]
      }, {
        role: { _id: 'ALL_PERMISSIONS' },
        scope: 'scope',
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'ALL_PERMISSIONS' },
          { _id: 'EDIT_PERMISSION' },
          { _id: 'VIEW_PERMISSION' },
          { _id: 'MODERATE_PERMISSION' },
          { _id: 'DELETE_PERMISSION' }
        ]
      }, {
        role: { _id: 'admin' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'admin' },
          { _id: 'DELETE_PERMISSION' }
        ]
      }])

      Roles.removeUsersFromRoles(users.eve, ['admin'])

      test.isTrue(Roles.userIsInRole(users.eve, 'DELETE_PERMISSION'))
      test.isTrue(Roles.userIsInRole(users.eve, 'DELETE_PERMISSION', 'scope'))

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'user' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'user' },
          { _id: 'ALL_PERMISSIONS' },
          { _id: 'EDIT_PERMISSION' },
          { _id: 'VIEW_PERMISSION' },
          { _id: 'MODERATE_PERMISSION' },
          { _id: 'DELETE_PERMISSION' }
        ]
      }, {
        role: { _id: 'ALL_PERMISSIONS' },
        scope: 'scope',
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'ALL_PERMISSIONS' },
          { _id: 'EDIT_PERMISSION' },
          { _id: 'VIEW_PERMISSION' },
          { _id: 'MODERATE_PERMISSION' },
          { _id: 'DELETE_PERMISSION' }
        ]
      }])

      Roles.deleteRole('ALL_PERMISSIONS')

      test.isFalse(Roles.userIsInRole(users.eve, 'DELETE_PERMISSION'))
      test.isFalse(Roles.userIsInRole(users.eve, 'DELETE_PERMISSION', 'scope'))

      test.isFalse(Roles.userIsInRole(users.eve, 'MODERATE_PERMISSION'))
      test.isFalse(Roles.userIsInRole(users.eve, 'MODERATE_PERMISSION', 'scope'))

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'user' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'user' }
        ]
      }])
    })

  Tinytest.add(
    'roles - delete role with overlapping hierarchical roles',
    function (test) {
      reset()

      Roles.createRole('role1')
      Roles.createRole('role2')
      Roles.createRole('COMMON_PERMISSION_1')
      Roles.createRole('COMMON_PERMISSION_2')
      Roles.createRole('COMMON_PERMISSION_3')
      Roles.createRole('EXTRA_PERMISSION_ROLE_1')
      Roles.createRole('EXTRA_PERMISSION_ROLE_2')

      Roles.addRolesToParent('COMMON_PERMISSION_1', 'role1')
      Roles.addRolesToParent('COMMON_PERMISSION_2', 'role1')
      Roles.addRolesToParent('COMMON_PERMISSION_3', 'role1')
      Roles.addRolesToParent('EXTRA_PERMISSION_ROLE_1', 'role1')

      Roles.addRolesToParent('COMMON_PERMISSION_1', 'role2')
      Roles.addRolesToParent('COMMON_PERMISSION_2', 'role2')
      Roles.addRolesToParent('COMMON_PERMISSION_3', 'role2')
      Roles.addRolesToParent('EXTRA_PERMISSION_ROLE_2', 'role2')

      Roles.addUsersToRoles(users.eve, 'role1')
      Roles.addUsersToRoles(users.eve, 'role2')

      test.isTrue(Roles.userIsInRole(users.eve, 'COMMON_PERMISSION_1'))
      test.isTrue(Roles.userIsInRole(users.eve, 'EXTRA_PERMISSION_ROLE_1'))
      test.isTrue(Roles.userIsInRole(users.eve, 'EXTRA_PERMISSION_ROLE_2'))

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'role1' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'role1' },
          { _id: 'COMMON_PERMISSION_1' },
          { _id: 'COMMON_PERMISSION_2' },
          { _id: 'COMMON_PERMISSION_3' },
          { _id: 'EXTRA_PERMISSION_ROLE_1' }
        ]
      }, {
        role: { _id: 'role2' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'role2' },
          { _id: 'COMMON_PERMISSION_1' },
          { _id: 'COMMON_PERMISSION_2' },
          { _id: 'COMMON_PERMISSION_3' },
          { _id: 'EXTRA_PERMISSION_ROLE_2' }
        ]
      }])

      Roles.removeUsersFromRoles(users.eve, 'role2')

      test.isTrue(Roles.userIsInRole(users.eve, 'COMMON_PERMISSION_1'))
      test.isTrue(Roles.userIsInRole(users.eve, 'EXTRA_PERMISSION_ROLE_1'))
      test.isFalse(Roles.userIsInRole(users.eve, 'EXTRA_PERMISSION_ROLE_2'))

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'role1' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'role1' },
          { _id: 'COMMON_PERMISSION_1' },
          { _id: 'COMMON_PERMISSION_2' },
          { _id: 'COMMON_PERMISSION_3' },
          { _id: 'EXTRA_PERMISSION_ROLE_1' }
        ]
      }])

      Roles.addUsersToRoles(users.eve, 'role2')

      test.isTrue(Roles.userIsInRole(users.eve, 'COMMON_PERMISSION_1'))
      test.isTrue(Roles.userIsInRole(users.eve, 'EXTRA_PERMISSION_ROLE_1'))
      test.isTrue(Roles.userIsInRole(users.eve, 'EXTRA_PERMISSION_ROLE_2'))

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'role1' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'role1' },
          { _id: 'COMMON_PERMISSION_1' },
          { _id: 'COMMON_PERMISSION_2' },
          { _id: 'COMMON_PERMISSION_3' },
          { _id: 'EXTRA_PERMISSION_ROLE_1' }
        ]
      }, {
        role: { _id: 'role2' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'role2' },
          { _id: 'COMMON_PERMISSION_1' },
          { _id: 'COMMON_PERMISSION_2' },
          { _id: 'COMMON_PERMISSION_3' },
          { _id: 'EXTRA_PERMISSION_ROLE_2' }
        ]
      }])

      Roles.deleteRole('role2')

      test.isTrue(Roles.userIsInRole(users.eve, 'COMMON_PERMISSION_1'))
      test.isTrue(Roles.userIsInRole(users.eve, 'EXTRA_PERMISSION_ROLE_1'))
      test.isFalse(Roles.userIsInRole(users.eve, 'EXTRA_PERMISSION_ROLE_2'))

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'role1' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [
          { _id: 'role1' },
          { _id: 'COMMON_PERMISSION_1' },
          { _id: 'COMMON_PERMISSION_2' },
          { _id: 'COMMON_PERMISSION_3' },
          { _id: 'EXTRA_PERMISSION_ROLE_1' }
        ]
      }])
    })

  Tinytest.add(
    'roles - set parent on assigned role',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('EDIT_PERMISSION')

      Roles.addUsersToRoles(users.eve, 'EDIT_PERMISSION')

      test.isTrue(Roles.userIsInRole(users.eve, 'EDIT_PERMISSION'))
      test.isFalse(Roles.userIsInRole(users.eve, 'admin'))

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'EDIT_PERMISSION' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [{ _id: 'EDIT_PERMISSION' }]
      }])

      Roles.addRolesToParent('EDIT_PERMISSION', 'admin')

      test.isTrue(Roles.userIsInRole(users.eve, 'EDIT_PERMISSION'))
      test.isFalse(Roles.userIsInRole(users.eve, 'admin'))

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'EDIT_PERMISSION' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [{ _id: 'EDIT_PERMISSION' }]
      }])
    })

  Tinytest.add(
    'roles - remove parent on assigned role',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('EDIT_PERMISSION')

      Roles.addRolesToParent('EDIT_PERMISSION', 'admin')

      Roles.addUsersToRoles(users.eve, 'EDIT_PERMISSION')

      test.isTrue(Roles.userIsInRole(users.eve, 'EDIT_PERMISSION'))
      test.isFalse(Roles.userIsInRole(users.eve, 'admin'))

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'EDIT_PERMISSION' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [{ _id: 'EDIT_PERMISSION' }]
      }])

      Roles.removeRolesFromParent('EDIT_PERMISSION', 'admin')

      test.isTrue(Roles.userIsInRole(users.eve, 'EDIT_PERMISSION'))
      test.isFalse(Roles.userIsInRole(users.eve, 'admin'))

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'EDIT_PERMISSION' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [{ _id: 'EDIT_PERMISSION' }]
      }])
    })

  Tinytest.add(
    'roles - adding and removing extra role parents',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('EDIT_PERMISSION')

      Roles.addRolesToParent('EDIT_PERMISSION', 'admin')

      Roles.addUsersToRoles(users.eve, 'EDIT_PERMISSION')

      test.isTrue(Roles.userIsInRole(users.eve, 'EDIT_PERMISSION'))
      test.isFalse(Roles.userIsInRole(users.eve, 'admin'))

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'EDIT_PERMISSION' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [{ _id: 'EDIT_PERMISSION' }]
      }])

      Roles.addRolesToParent('EDIT_PERMISSION', 'user')

      test.isTrue(Roles.userIsInRole(users.eve, 'EDIT_PERMISSION'))
      test.isFalse(Roles.userIsInRole(users.eve, 'admin'))

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'EDIT_PERMISSION' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [{ _id: 'EDIT_PERMISSION' }]
      }])

      Roles.removeRolesFromParent('EDIT_PERMISSION', 'user')

      test.isTrue(Roles.userIsInRole(users.eve, 'EDIT_PERMISSION'))
      test.isFalse(Roles.userIsInRole(users.eve, 'admin'))

      itemsEqual(test, Roles.getRolesForUser(users.eve, { anyScope: true, fullObjects: true }).map(obj => { delete obj._id; return obj }), [{
        role: { _id: 'EDIT_PERMISSION' },
        scope: null,
        user: { _id: users.eve },
        inheritedRoles: [{ _id: 'EDIT_PERMISSION' }]
      }])
    })

  Tinytest.add(
    'roles - cyclic roles',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('editor')
      Roles.createRole('user')

      Roles.addRolesToParent('editor', 'admin')
      Roles.addRolesToParent('user', 'editor')

      test.throws(function () {
        Roles.addRolesToParent('admin', 'user')
      }, /form a cycle/)
    })

  Tinytest.add(
    'roles - userIsInRole returns false for unknown roles',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('user')
      Roles.createRole('editor')
      Roles.addUsersToRoles(users.eve, ['admin', 'user'])
      Roles.addUsersToRoles(users.eve, ['editor'])

      test.isFalse(Roles.userIsInRole(users.eve, 'unknown'))
      test.isFalse(Roles.userIsInRole(users.eve, []))
      test.isFalse(Roles.userIsInRole(users.eve, null))
      test.isFalse(Roles.userIsInRole(users.eve, undefined))

      test.isFalse(Roles.userIsInRole(users.eve, 'unknown', { anyScope: true }))
      test.isFalse(Roles.userIsInRole(users.eve, [], { anyScope: true }))
      test.isFalse(Roles.userIsInRole(users.eve, null, { anyScope: true }))
      test.isFalse(Roles.userIsInRole(users.eve, undefined, { anyScope: true }))
    })

  Tinytest.add(
    'roles - isParentOf - returns false for unknown roles',
    function (test) {
      reset()

      Roles.createRole('admin')

      test.isFalse(Roles.isParentOf('admin', 'unknown'))
      test.isFalse(Roles.isParentOf('admin', null))
      test.isFalse(Roles.isParentOf('admin', undefined))

      test.isFalse(Roles.isParentOf('unknown', 'admin'))
      test.isFalse(Roles.isParentOf(null, 'admin'))
      test.isFalse(Roles.isParentOf(undefined, 'admin'))
    })

  Tinytest.add(
    'roles - isParentOf - returns false if role is not parent of',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('editor')
      Roles.createRole('user')
      Roles.addRolesToParent(['editor'], 'admin')
      Roles.addRolesToParent(['user'], 'editor')

      test.isFalse(Roles.isParentOf('user', 'admin'))
      test.isFalse(Roles.isParentOf('editor', 'admin'))
    })

  Tinytest.add(
    'roles - isParentOf - returns true if role is parent of the demanded role',
    function (test) {
      reset()

      Roles.createRole('admin')
      Roles.createRole('editor')
      Roles.createRole('user')
      Roles.addRolesToParent(['editor'], 'admin')
      Roles.addRolesToParent(['user'], 'editor')

      test.isTrue(Roles.isParentOf('admin', 'user'))
      test.isTrue(Roles.isParentOf('editor', 'user'))
      test.isTrue(Roles.isParentOf('admin', 'editor'))

      test.isTrue(Roles.isParentOf('admin', 'admin'))
      test.isTrue(Roles.isParentOf('editor', 'editor'))
      test.isTrue(Roles.isParentOf('user', 'user'))
    })
}())
