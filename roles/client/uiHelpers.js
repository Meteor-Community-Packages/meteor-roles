"use strict"

/**
 * Convenience functions for use on client.
 *
 * NOTE: You must restrict user actions on the server-side; any
 * client-side checks are strictly for convenience and must not be
 * trusted.
 *
 * @module UIHelpers
 */


////////////////////////////////////////////////////////////
// UI helpers
//
// Use a semi-private variable rather than declaring UI
// helpers directly so that we can unit test the helpers.
// XXX For some reason, the UI helpers are not registered 
// before the tests run.
//
Roles._uiHelpers = {

  /**
   * UI helper to check if current user is in at least one
   * of the target roles.  For use in client-side templates.
   *
   * @example
   *     {{#if isInRole 'admin'}}
   *     {{/if}}
   *
   *     {{#if isInRole 'editor,user'}}
   *     {{/if}}
   *
   *     {{#if isInRole 'editor,user' 'partition1'}}
   *     {{/if}}
   *
   * @method isInRole
   * @param {String} role Name of role or comma-seperated list of roles.
   * @param {String} [partition] Optional, name of partition to check.
   * @return {Boolean} `true` if current user is in at least one of the target roles.
   * @static
   * @for UIHelpers 
   */
  isInRole: function (role, partition) {
    var user = Meteor.user(),
        comma = (role || '').indexOf(','),
        roles

    if (!user) return false
    if (!Match.test(role, String)) return false

    if (comma !== -1) {
      roles = _.reduce(role.split(','), function (memo, r) {
        if (!r || !Roles._trim(r)) {
          return memo
        }
        memo.push(Roles._trim(r))
        return memo
      }, [])
    } else {
      roles = [role]
    }

    if (Match.test(partition, String)) {
      return Roles.userIsInRole(user, roles, partition)
    }

    return Roles.userIsInRole(user, roles)
  }
}



////////////////////////////////////////////////////////////
// Register UI helpers
//

if (Roles.debug && console.log) {
  console.log("[roles] Roles.debug =", Roles.debug)
}

if ('undefined' !== typeof Package.blaze &&
    'undefined' !== typeof Package.blaze.Blaze &&
    'function'  === typeof Package.blaze.Blaze.registerHelper) {
  _.each(Roles._uiHelpers, function (func, name) {
    if (Roles.debug && console.log) {
      console.log("[roles] registering Blaze helper '" + name + "'")
    }
    Package.blaze.Blaze.registerHelper(name, func) 
  })
}
