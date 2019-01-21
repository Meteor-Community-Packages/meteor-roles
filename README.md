meteor-roles
============

Authorization package for Meteor - compatible with built-in accounts package.

<br />

<a id="roles-toc" name="roles-toc"></a>
### Table of Contents
* [Contributors](#roles-contributors)
* [Authorization](#roles-authorization)
* [Permissions vs roles](#roles-naming)
* [What are "scopes"?](#roles-scopes)
* [Changes to default Meteor](#roles-changes)
* [Installation](#roles-installing)
* [Migration to 2.0](#roles-migration)
* [Usage examples](#roles-usage)
* [Online API docs](#roles-docs)
* [Example apps](#roles-example-apps)
* [Running tests](#roles-testing)

<br />


<a id="roles-contributors" name="roles-contributors"></a>
### Contributors

Thanks to:

  * [@mitar](https://github.com/mitar)
  * [@challett](https://github.com/challett)
  * [@ianserlin](https://github.com/ianserlin)
  * [@leebenson](https://github.com/leebenson)
  * [@pward123](https://github.com/pward123)
  * [@dandv](https://github.com/dandv)
  * [@aldeed](https://github.com/aldeed)
  * [@kevb](https://github.com/kevb)
  * [@zimme](https://github.com/zimme)
  * [@danieljonce](https://github.com/danieljonce)
  * [@pascoual](https://github.com/pascoual)
  * [@nickmoylan](https://github.com/nickmoylan)
  * [@mcrider](https://github.com/mcrider)
  * [@alanning](https://github.com/alanning)

<br />


<a id="roles-authorization" name="roles-authorization"></a>
### Authorization

This package lets you attach roles to a user which you can then check against later when deciding whether to grant
access to Meteor methods or publish data.  The core concept is very simple, essentially you are attaching roles
to a user object and then checking for the existence of those roles later. In some sense, it is very similar to
tags on blog posts. This package provides helper methods to make the process of adding, removing, and verifying
those roles easier.

<br />

<a id="roles-naming" name="roles-naming"></a>
### Permissions vs roles  (or What's in a name...)

Although the name of this package is `roles`, you can define your **roles**, **groups** or **permissions** however you like.
They are essentially just tags that you assign to a user and which you can check upon later.

You can have traditional roles like, `admin` or `webmaster`, or you can assign more granular permissions such
as, `view-secrets`, `users.view`, or `users.manage`.  Often, more granular is actually better because you are
able to handle all those pesky edge cases that come up in real-life usage without creating a ton of higher-level
`roles`.  With the `roles` package, it's all just a role object.

Roles can be put into a **hierarchy**.  
Roles can have multiple parents and can be children (subroles) of multiple roles.
If a parent role is set to the user, all its descendants are also applying. 
You can use this to create "super roles" aggregating permissions all the way through the bottom of the tree.  
For example, you could name two top-level roles `user` and `admin` and then you could use your second-level roles as permissions and name them `USERS_VIEW`, `POST_EDIT`, and similar.
Then you could set `admin` role as parent role for `USERS_VIEW` and `POST_EDIT`, while `user` would be parent
only of the `POST_EDIT` role. You can then assign `user` and `admin` roles to your users. And if you need to
change permissions later for the whole role, just add or remove children roles. You can create roles from this example
with:

```javascript
Roles.createRole('user');
Roles.createRole('admin');
Roles.createRole('USERS_VIEW');
Roles.createRole('POST_EDIT');
Roles.addRolesToParent('USERS_VIEW', 'admin');
Roles.addRolesToParent('POST_EDIT', 'admin');
Roles.addRolesToParent('POST_EDIT', 'user');
```

<br />

<a id="roles-scopes" name="roles-scopes"></a>
### What are "scopes"?

Sometimes it is useful to let a user have independent sets of roles.  The `roles` package calls these independent
sets "scopes" for lack of a better term. You can use them to represent various communities inside of your
application. Or maybe your application supports [multiple tenants](https://en.wikipedia.org/wiki/Multitenancy).
You can put each of those tenants into their own scope. Alternatively, you can use scopes to represent
various resources you have. But if you really need per-document permissions, if might be that storing permissions
with documents is a better approach (than one takes by this package, where roles are stored with users).

Users can have both scope roles assigned, and global roles. Global roles are in effect for all scopes.
But scopes are independent from each other. Users can have one set of roles in scope A and another set
of roles in scope B. Let's go through an example of this using soccer/football teams as scopes.

```javascript
Roles.addUsersToRoles(joesUserId, ['manage-team','schedule-game'], 'manchester-united.com');
Roles.addUsersToRoles(joesUserId, ['player','goalie'], 'real-madrid.com');

Roles.userIsInRole(joesUserId, 'manage-team', 'manchester-united.com'); // true
Roles.userIsInRole(joesUserId, 'manage-team', 'real-madrid.com'); // false
```

In this example we can see that Joe manages Manchester United and plays for Real Madrid. By using scopes, we can
assign roles independently and make sure that they don't get mixed up between scopes.

Now, let's take a look at how to use the global roles. Say we want to give Joe permission to do something across
all of our scopes. That is what the global roles are for:

```javascript
Roles.addUsersToRoles(joesUserId, 'super-admin', null); // Or you could just omit the last argument.

if (Roles.userIsInRole(joesUserId, ['manage-team', 'super-admin'], 'real-madrid.com')) {
  // True! Even though Joe doesn't manage Real Madrid, he has
  // a 'super-admin' global role so this check succeeds.
}
```

<br />

<a id="roles-changes" name="roles-changes"></a>
### Changes to default Meteor behavior

  1. User entries in the `Meteor.users` collection gain a new field named `roles` corresponding to the user's roles.
  2. A new collection `Meteor.roles` contains a global list of defined role names.
  3. The currently logged-in user's `roles` field is automatically published to the client.
  4. All existing roles are automatically published to the client.

<br />

<a id="roles-installing" name="roles-installing"></a>
### Installing

1. Add one of the built-in accounts packages so the `Meteor.users` collection exists.  From a command prompt:
    ```bash
    meteor add accounts-password
    ```

3. Add this package to your project.  From a command prompt:
    ```bash
    meteor add alanning:roles
    ```

4. Run your application:
    ```bash
    meteor
    ```

<br />

<a id="roles-migration" name="roles-migration"></a>
### Migration to 2.0

In meteor-roles 2.0, functions are mostly backwards compatible with 1.0, but roles are stored differently in the database. To migrate the database to new schema, run `Meteor._forwardMigrate()` on the server:

```bash
meteor shell
> Package['alanning:roles'].Roles._forwardMigrate()
```

#### Changes between 1.0 and 2.0

Here is the list of important changes between meteor-roles 1.0 and 2.0 to consider when migrating to 2.0:

* New schema for `roles` field and `Meteor.roles` collection.
* Groups were renamed to scopes.
* Scopes are always available, if you do not specify a scope, role is seen as a global role.
* `GLOBAL_GROUP` is deprecated and should not be used anymore (just do not specify a scope, or use `null`).
* `getGroupsForUser` is deprecated, `getScopesForUser` should be used instead.
* Functions which modify roles are available both on the client and server side, but should be called on the
  client side only from inside Meteor methods.
* `deleteRole` can now delete role even when in use, it is automatically unset from all users.
* Functions `addRolesToParent` and `removeRolesFromParent` were added.
* `addUsersToRoles` and `setUserRoles` now require that roles exist and will not create missing roles automatically.
* All functions work with 1.0 arguments, but in 2.0 accept extra arguments and/or options.

<br />


<a id="roles-usage" name="roles-usage"></a>
### Usage Examples

<br />

Here are some potential use cases:

<br />

-- **Server** --


Add users to roles:
```js
var users = [
      {name:"Normal User",email:"normal@example.com",roles:[]},
      {name:"View-Secrets User",email:"view@example.com",roles:['view-secrets']},
      {name:"Manage-Users User",email:"manage@example.com",roles:['manage-users']},
      {name:"Admin User",email:"admin@example.com",roles:['admin']}
    ];

users.forEach(function (user) {
  var id;

  id = Accounts.createUser({
    email: user.email,
    password: "apple1",
    profile: { name: user.name }
  });

  if (user.roles.length > 0) {
    user.roles.forEach(function (role) {
      Roles.createRole(role, {unlessExists: true});
    });
    // Need _id of existing user record so this call must come after `Accounts.createUser`.
    Roles.addUsersToRoles(id, user.roles);
  }

});
```

<br />
Note that the `Roles.addUsersToRoles` call needs to come _after_ `Accounts.createUser` or else
the roles package won't be able to find the user record (since it hasn't been created yet).
You can use `postSignUpHook` to assign roles when using
[user accounts package](https://github.com/meteor-useraccounts/core).
This SO answer gives more detail: http://stackoverflow.com/a/22650399/219238

<br />

Check user roles before publishing sensitive data:
```js
// server/publish.js

// Give authorized users access to sensitive data by group
Meteor.publish('secrets', function (scope) {
  check(scope, String);

  if (Roles.userIsInRole(this.userId, ['view-secrets','admin'], scope)) {
    
    return Meteor.secrets.find({scope: scope});
    
  } else {

    // user not authorized. do not publish secrets
    this.stop();
    return;

  }
});
```

<br />

Prevent non-authorized users from creating new users:
```js
Accounts.validateNewUser(function (user) {
  var loggedInUser = Meteor.user();

  if (Roles.userIsInRole(loggedInUser, ['admin','manage-users'])) {
    return true;
  }

  throw new Meteor.Error('unauthorized', "Not authorized to create new users");
});
```

<br />

Prevent access to certain functionality, such as deleting a user:
```js
// server/userMethods.js

Meteor.methods({
  /**
   * Revokes roles for a user in a specific scope.
   * 
   * @method revokeUser
   * @param {String} targetUserId ID of user to revoke roles for.
   * @param {String} scope Company to update roles for.
   */
  revokeUser: function (targetUserId, scope) {
    check(targetUserId, String);
    check(scope, String);
  
    var loggedInUser = Meteor.user();

    if (!loggedInUser ||
        !Roles.userIsInRole(loggedInUser, 
                            ['manage-users', 'support-staff'], scope)) {
      throw new Meteor.Error('access-denied', "Access denied")
    }

    // remove roles for target scope
    Roles.setUserRoles(targetUserId, [], scope)
  }
})
```

<br />

Manage a user's roles:
```js
// server/userMethods.js

Meteor.methods({
  /**
   * Update a user's roles.
   *
   * @param {Object} targetUserId Id of user to update.
   * @param {Array} roles User's new roles.
   * @param {String} scope Company to update roles for.
   */
  updateRoles: function (targetUserId, roles, scope) {
    check(targetUserId, String);
    check(roles, [String]);
    check(scope, String);

    var loggedInUser = Meteor.user();

    if (!loggedInUser ||
        !Roles.userIsInRole(loggedInUser, 
                            ['manage-users', 'support-staff'], scope)) {
      throw new Meteor.Error('access-denied', "Access denied");
    }

    Roles.setUserRoles(targetUserId, roles, scope);
  }
})
```

<br />

-- **Client** --

Client javascript has access to all the same Roles functions as the server with the addition of a `isInRole`
handlebars helper which is automatically registered by the Roles package.

As with all Meteor applications, client-side checks are a convenience, rather than a true security implementation 
since Meteor bundles the same client-side code to all users.  Providing the Roles functions client-side also allows
for latency compensation during Meteor method calls.  Roles functions which modify the database should not be
called directly, but inside the Meteor methods.

NOTE: Any sensitive data needs to be controlled server-side to prevent unwanted disclosure. To be clear, Meteor sends
all templates, client-side javascript, and published data to the client's browser. This is by design and is a good thing.
The following example is just sugar to help improve the user experience for normal users. Those interested in seeing
the 'admin_nav' template in the example below will still be able to do so by manually reading the bundled `client.js`
file. It won't be pretty but it is possible. But this is not a problem as long as the actual data is restricted server-side.

To check for global roles or when not using scopes:

```handlebars
<!-- client/myApp.html -->

<template name="header">
  ... regular header stuff
  {{#if isInRole 'admin'}}
    {{> admin_nav}}  
  {{/if}}
  {{#if isInRole 'admin,editor'}}
    {{> editor_stuff}}
  {{/if}}
</template>
```

To check for roles when using scopes:

```handlebars
<!-- client/myApp.html -->

<template name="header">
  ... regular header stuff
  {{#if isInRole 'admin,editor' 'group1'}}
    {{> editor_stuff}}  
  {{/if}}
</template>
```

<br />


<a id="roles-docs" name="roles-docs"></a>
### API Docs

Online API docs found here: http://alanning.github.io/meteor-roles/classes/Roles.html

API docs generated using [YUIDoc](http://yui.github.com/yuidoc/)

To re-generate documentation:
  1. install YUIDoc
  2. `cd meteor-roles`
  3. `yuidoc`

To serve documentation locally:
  1. install YUIDoc
  2. `cd meteor-roles`
  3. `yuidoc --server 5000`
  4. point browser at http://localhost:5000/


<br />


<a id="roles-example-apps" name="roles-example-apps"></a>
### Example Apps

The `examples` directory contains Meteor apps which show off the following features:
* Server-side publishing with authorization to secure sensitive data
* Client-side navigation with link visibility based on user roles
* 'Sign-in required' app with up-front login page using `accounts-ui`
* Client-side routing

View the `flow-router` example app online @  <a href="http://roles.meteor.com/" target="_blank">http://roles.meteor.com/</a>

  1. `git clone https://github.com/alanning/meteor-roles.git`
  2. choose an example, eg.
    * `cd meteor-roles/examples/iron-router` or
    * `cd meteor-roles/examples/flow-router`
  3. `meteor`
  4. point browser to `http://localhost:3000`

<br />


<a id="roles-testing" name="roles-testing"></a>
### Tests


To run tests:
  1. `cd meteor-roles`
  2. `meteor test-packages ./`
  3. point browser at http://localhost:3000/

_NOTE_: If you see an error message regarding **"The package named roles does not exist"** that means you are either:
  a) in the wrong directory or 
  b) forgot the './' in step 2.  

Step 2 needs to be run in the main 'meteor-roles' directory and the './' is needed because otherwise Meteor
expects to be in a Meteor app directory.
