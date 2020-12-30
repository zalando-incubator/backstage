/*
 * Copyright 2020 Spotify AB
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { GroupEntity, UserEntity } from '@backstage/catalog-model';
import { SearchEntry } from 'ldapjs';
import merge from 'lodash/merge';
import { RecursivePartial } from '../../../util';
import { LdapClient } from './client';
import { GroupConfig, UserConfig } from './config';
import {
  LDAP_DN_ANNOTATION,
  LDAP_RDN_ANNOTATION,
  LDAP_UUID_ANNOTATION,
} from './constants';
import { readLdapGroups, readLdapUsers, resolveRelations } from './read';

function user(data: RecursivePartial<UserEntity>): UserEntity {
  return merge(
    {},
    {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'User',
      metadata: { name: 'name' },
      spec: { profile: {}, memberOf: [] },
    } as UserEntity,
    data,
  );
}

function group(data: RecursivePartial<GroupEntity>): GroupEntity {
  return merge(
    {},
    {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Group',
      metadata: { name: 'name' },
      spec: { type: 'type', children: [] },
    } as GroupEntity,
    data,
  );
}

function searchEntry(attributes: Record<string, string[]>): SearchEntry {
  return {
    attributes: Object.entries(attributes).map(([k, vs]) => ({
      json: {
        type: k,
        vals: vs,
      },
    })),
  } as any;
}

describe('readLdapUsers', () => {
  const client: jest.Mocked<LdapClient> = {
    search: jest.fn(),
  } as any;

  afterEach(() => jest.resetAllMocks());

  it('transfers all attributes', async () => {
    client.search.mockResolvedValue([
      searchEntry({
        uid: ['uid-value'],
        description: ['description-value'],
        cn: ['cn-value'],
        mail: ['mail-value'],
        avatarUrl: ['avatarUrl-value'],
        memberOf: ['x', 'y', 'z'],
        entryDN: ['dn-value'],
        entryUUID: ['uuid-value'],
      }),
    ]);
    const config: UserConfig = {
      dn: 'ddd',
      options: {},
      map: {
        rdn: 'uid',
        name: 'uid',
        description: 'description',
        displayName: 'cn',
        email: 'mail',
        picture: 'avatarUrl',
        memberOf: 'memberOf',
      },
    };
    const { users, userMemberOf } = await readLdapUsers(client, config);
    expect(users).toEqual([
      expect.objectContaining({
        metadata: {
          name: 'uid-value',
          description: 'description-value',
          annotations: {
            [LDAP_DN_ANNOTATION]: 'dn-value',
            [LDAP_RDN_ANNOTATION]: 'uid-value',
            [LDAP_UUID_ANNOTATION]: 'uuid-value',
          },
        },
        spec: {
          profile: {
            displayName: 'cn-value',
            email: 'mail-value',
            picture: 'avatarUrl-value',
          },
          memberOf: [],
        },
      }),
    ]);
    expect(userMemberOf).toEqual(
      new Map([['dn-value', new Set(['x', 'y', 'z'])]]),
    );
  });
});

describe('readLdapGroups', () => {
  const client: jest.Mocked<LdapClient> = {
    search: jest.fn(),
  } as any;

  afterEach(() => jest.resetAllMocks());

  it('transfers all attributes', async () => {
    client.search.mockResolvedValue([
      searchEntry({
        cn: ['cn-value'],
        description: ['description-value'],
        tt: ['type-value'],
        mail: ['mail-value'],
        avatarUrl: ['avatarUrl-value'],
        memberOf: ['x', 'y', 'z'],
        member: ['e', 'f', 'g'],
        entryDN: ['dn-value'],
        entryUUID: ['uuid-value'],
      }),
    ]);
    const config: GroupConfig = {
      dn: 'ddd',
      options: {},
      map: {
        rdn: 'cn',
        name: 'cn',
        description: 'description',
        displayName: 'cn',
        email: 'mail',
        picture: 'avatarUrl',
        type: 'tt',
        memberOf: 'memberOf',
        members: 'member',
      },
    };
    const { groups, groupMember, groupMemberOf } = await readLdapGroups(
      client,
      config,
    );
    expect(groups).toEqual([
      expect.objectContaining({
        metadata: {
          name: 'cn-value',
          description: 'description-value',
          annotations: {
            [LDAP_DN_ANNOTATION]: 'dn-value',
            [LDAP_RDN_ANNOTATION]: 'cn-value',
            [LDAP_UUID_ANNOTATION]: 'uuid-value',
          },
        },
        spec: {
          type: 'type-value',
          profile: {
            displayName: 'cn-value',
            email: 'mail-value',
            picture: 'avatarUrl-value',
          },
          children: [],
        },
      }),
    ]);
    expect(groupMember).toEqual(
      new Map([['dn-value', new Set(['e', 'f', 'g'])]]),
    );
    expect(groupMemberOf).toEqual(
      new Map([['dn-value', new Set(['x', 'y', 'z'])]]),
    );
  });
});

describe('resolveRelations', () => {
  describe('lookup', () => {
    it('matches by DN', () => {
      const parent = group({
        metadata: {
          name: 'parent',
          annotations: { [LDAP_DN_ANNOTATION]: 'pa' },
        },
      });
      const child = group({
        metadata: {
          name: 'child',
          annotations: { [LDAP_DN_ANNOTATION]: 'ca' },
        },
      });
      const groupMember = new Map<string, Set<string>>([
        ['pa', new Set(['ca'])],
      ]);
      resolveRelations([parent, child], [], new Map(), new Map(), groupMember);
      expect(parent.spec.children).toEqual(['child']);
      expect(child.spec.parent).toEqual('parent');
    });
    it('matches by UUID', () => {
      const parent = group({
        metadata: {
          name: 'parent',
          annotations: { [LDAP_UUID_ANNOTATION]: 'pa' },
        },
      });
      const child = group({
        metadata: {
          name: 'child',
          annotations: { [LDAP_UUID_ANNOTATION]: 'ca' },
        },
      });
      const groupMember = new Map<string, Set<string>>([
        ['pa', new Set(['ca'])],
      ]);
      resolveRelations([parent, child], [], new Map(), new Map(), groupMember);
      expect(parent.spec.children).toEqual(['child']);
      expect(child.spec.parent).toEqual('parent');
    });
  });

  describe('userMemberOf', () => {
    it('populates relations by dn', () => {
      const host = group({
        metadata: { name: 'host', annotations: { [LDAP_DN_ANNOTATION]: 'ha' } },
      });
      const member = user({
        metadata: {
          name: 'member',
          annotations: { [LDAP_DN_ANNOTATION]: 'ma' },
        },
      });
      const userMemberOf = new Map<string, Set<string>>([
        ['ma', new Set(['ha'])],
      ]);
      resolveRelations([host], [member], userMemberOf, new Map(), new Map());
      expect(member.spec.memberOf).toEqual(['host']);
    });

    it('populates relations by uuid', () => {
      const host = group({
        metadata: {
          name: 'host',
          annotations: { [LDAP_UUID_ANNOTATION]: 'ha' },
        },
      });
      const member = user({
        metadata: {
          name: 'member',
          annotations: { [LDAP_DN_ANNOTATION]: 'ma' },
        },
      });
      const userMemberOf = new Map<string, Set<string>>([
        ['ma', new Set(['ha'])],
      ]);
      resolveRelations([host], [member], userMemberOf, new Map(), new Map());
      expect(member.spec.memberOf).toEqual(['host']);
    });
  });

  describe('groupMemberOf', () => {
    it('populates relations by dn', () => {
      const parent = group({
        metadata: {
          name: 'parent',
          annotations: { [LDAP_DN_ANNOTATION]: 'pa' },
        },
      });
      const child = group({
        metadata: {
          name: 'child',
          annotations: { [LDAP_DN_ANNOTATION]: 'ca' },
        },
      });
      const groupMemberOf = new Map<string, Set<string>>([
        ['ca', new Set(['pa'])],
      ]);
      resolveRelations(
        [parent, child],
        [],
        new Map(),
        groupMemberOf,
        new Map(),
      );
      expect(parent.spec.children).toEqual(['child']);
      expect(child.spec.parent).toEqual('parent');
    });
  });

  it('populates relations by uuid', () => {
    const parent = group({
      metadata: {
        name: 'parent',
        annotations: { [LDAP_UUID_ANNOTATION]: 'pa' },
      },
    });
    const child = group({
      metadata: {
        name: 'child',
        annotations: { [LDAP_UUID_ANNOTATION]: 'ca' },
      },
    });
    const groupMemberOf = new Map<string, Set<string>>([
      ['ca', new Set(['pa'])],
    ]);
    resolveRelations([parent, child], [], new Map(), groupMemberOf, new Map());
    expect(parent.spec.children).toEqual(['child']);
    expect(child.spec.parent).toEqual('parent');
  });

  describe('groupMember', () => {
    it('populates relations by dn', () => {
      const parent = group({
        metadata: {
          name: 'parent',
          annotations: { [LDAP_DN_ANNOTATION]: 'pa' },
        },
      });
      const child = group({
        metadata: {
          name: 'child',
          annotations: { [LDAP_DN_ANNOTATION]: 'ca' },
        },
      });
      const member = user({
        metadata: {
          name: 'member',
          annotations: { [LDAP_DN_ANNOTATION]: 'ma' },
        },
      });
      const groupMember = new Map<string, Set<string>>([
        ['pa', new Set(['ca', 'ma'])],
      ]);
      resolveRelations(
        [parent, child],
        [member],
        new Map(),
        new Map(),
        groupMember,
      );
      expect(parent.spec.children).toEqual(['child']);
      expect(child.spec.parent).toEqual('parent');
      expect(member.spec.memberOf).toEqual(['parent']);
    });

    it('populates relations by uuid', () => {
      const parent = group({
        metadata: {
          name: 'parent',
          annotations: { [LDAP_UUID_ANNOTATION]: 'pa' },
        },
      });
      const child = group({
        metadata: {
          name: 'child',
          annotations: { [LDAP_UUID_ANNOTATION]: 'ca' },
        },
      });
      const member = user({
        metadata: {
          name: 'member',
          annotations: { [LDAP_UUID_ANNOTATION]: 'ma' },
        },
      });
      const groupMember = new Map<string, Set<string>>([
        ['pa', new Set(['ca', 'ma'])],
      ]);
      resolveRelations(
        [parent, child],
        [member],
        new Map(),
        new Map(),
        groupMember,
      );
      expect(parent.spec.children).toEqual(['child']);
      expect(child.spec.parent).toEqual('parent');
      expect(member.spec.memberOf).toEqual(['parent']);
    });
  });
});
