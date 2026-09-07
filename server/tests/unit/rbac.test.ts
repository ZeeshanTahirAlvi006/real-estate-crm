import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ROLE_HIERARCHY, hasRolePrivilege } from '../../src/middleware/authorize.js'
import { USER_ROLES } from '../../src/utils/constants.js'

describe('RBAC & Role Privilege Unit Tests', () => {
  it('should verify hierarchical ranking order', () => {
    assert.ok(ROLE_HIERARCHY[USER_ROLES.SUPER_ADMIN] > ROLE_HIERARCHY[USER_ROLES.BROKERAGE_OWNER])
    assert.ok(ROLE_HIERARCHY[USER_ROLES.BROKERAGE_OWNER] > ROLE_HIERARCHY[USER_ROLES.TEAM_LEAD])
    assert.ok(ROLE_HIERARCHY[USER_ROLES.TEAM_LEAD] > ROLE_HIERARCHY[USER_ROLES.AGENT])
    assert.ok(ROLE_HIERARCHY[USER_ROLES.AGENT] > ROLE_HIERARCHY[USER_ROLES.LEAD])
  })

  it('should grant super_admin universal management privileges', () => {
    assert.equal(hasRolePrivilege(USER_ROLES.SUPER_ADMIN, USER_ROLES.SUPER_ADMIN), true)
    assert.equal(hasRolePrivilege(USER_ROLES.SUPER_ADMIN, USER_ROLES.BROKERAGE_OWNER), true)
    assert.equal(hasRolePrivilege(USER_ROLES.SUPER_ADMIN, USER_ROLES.TEAM_LEAD), true)
    assert.equal(hasRolePrivilege(USER_ROLES.SUPER_ADMIN, USER_ROLES.AGENT), true)
    assert.equal(hasRolePrivilege(USER_ROLES.SUPER_ADMIN, USER_ROLES.LEAD), true)
  })

  it('should allow brokerage_owner to manage team members but not super_admin', () => {
    assert.equal(hasRolePrivilege(USER_ROLES.BROKERAGE_OWNER, USER_ROLES.SUPER_ADMIN), false)
    assert.equal(hasRolePrivilege(USER_ROLES.BROKERAGE_OWNER, USER_ROLES.TEAM_LEAD), true)
    assert.equal(hasRolePrivilege(USER_ROLES.BROKERAGE_OWNER, USER_ROLES.AGENT), true)
    assert.equal(hasRolePrivilege(USER_ROLES.BROKERAGE_OWNER, USER_ROLES.LEAD), true)
  })

  it('should block agent from managing higher or equal roles', () => {
    assert.equal(hasRolePrivilege(USER_ROLES.AGENT, USER_ROLES.AGENT), false)
    assert.equal(hasRolePrivilege(USER_ROLES.AGENT, USER_ROLES.TEAM_LEAD), false)
    assert.equal(hasRolePrivilege(USER_ROLES.AGENT, USER_ROLES.BROKERAGE_OWNER), false)
    assert.equal(hasRolePrivilege(USER_ROLES.AGENT, USER_ROLES.SUPER_ADMIN), false)
  })
})
