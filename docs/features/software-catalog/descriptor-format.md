---
id: descriptor-format
title: Descriptor Format of Catalog Entities
sidebar_label: YAML File Format
# prettier-ignore
description: Documentation on Descriptor Format of Catalog Entities which describes the default data shape and semantics of catalog entities
---

This section describes the default data shape and semantics of catalog entities.

This both applies to objects given to and returned from the software catalog
API, as well as to the descriptor files that the software catalog can ingest
natively. In the API request/response cycle, a JSON representation is used,
while the descriptor files are on YAML format to be more easily maintainable by
humans. However, the structure and semantics are the same in both cases.

Although it's possible to name catalog entity descriptor files however you wish,
we recommend that you name them `catalog-info.yaml`.

## Contents

- [Overall Shape Of An Entity](#overall-shape-of-an-entity)
- [Common to All Kinds: The Envelope](#common-to-all-kinds-the-envelope)
- [Common to All Kinds: The Metadata](#common-to-all-kinds-the-metadata)
- [Common to All Kinds: Relations](#common-to-all-kinds-relations)
- [Kind: Component](#kind-component)
- [Kind: Template](#kind-template)
- [Kind: API](#kind-api)
- [Kind: Group](#kind-group)
- [Kind: User](#kind-user)
- [Kind: Resource](#kind-resource)
- [Kind: System](#kind-system)
- [Kind: Domain](#kind-domain)
- [Kind: Location](#kind-location)

## Overall Shape Of An Entity

The following is an example of the shape of an entity as returned from the
software catalog API.

```js
{
  "apiVersion": "backstage.io/v1alpha1",
  "kind": "Component",
  "metadata": {
    "annotations": {
      "backstage.io/managed-by-location": "file:/tmp/catalog-info.yaml",
      "example.com/service-discovery": "artistweb",
      "circleci.com/project-slug": "github/example-org/artist-website"
    },
    "description": "The place to be, for great artists",
    "etag": "ZjU2MWRkZWUtMmMxZS00YTZiLWFmMWMtOTE1NGNiZDdlYzNk",
    "generation": 1,
    "labels": {
      "system": "public-websites"
    },
    "tags": ["java"],
    "name": "artist-web",
    "uid": "2152f463-549d-4d8d-a94d-ce2b7676c6e2"
  },
  "spec": {
    "lifecycle": "production",
    "owner": "artist-relations@example.com",
    "type": "website"
  }
}
```

The corresponding descriptor file that generated it may look as follows:

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: artist-web
  description: The place to be, for great artists
  labels:
    system: public-websites
  annotations:
    example.com/service-discovery: artistweb
    circleci.com/project-slug: github/example-org/artist-website
  tags:
    - java
spec:
  type: website
  lifecycle: production
  owner: artist-relations@example.com
```

The root fields `apiVersion`, `kind`, `metadata`, and `spec` are part of the
_envelope_, defining the overall structure of all kinds of entity. Likewise,
some metadata fields like `name`, `labels`, and `annotations` are of special
significance and have reserved purposes and distinct shapes.

See below for details about these fields.

## Substitutions In The Descriptor Format

The descriptor format supports substitutions using `$text`, `$json`, and
`$yaml`.

Placeholders like `$json: https://example.com/entity.json` are substituted by
the content of the referenced file. Files can be referenced from any configured
integration similar to locations by passing an absolute URL. It's also possible
to reference relative files like `./referenced.yaml` from the same location.
Relative references are handled relative to the folder of the
`catalog-info.yaml` that contains the placeholder. There are three different
types of placeholders:

- `$text`: Interprets the contents of the referenced file as plain text and
  embeds it as a string.
- `$json`: Interprets the contents of the referenced file as JSON and embeds the
  parsed structure.
- `$yaml`: Interprets the contents of the referenced file as YAML and embeds the
  parsed structure.

For example, this can be used to load the definition of an API entity from a web
server and embed it as a string in the field `spec.definition`:

```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: petstore
  description: The Petstore API
spec:
  type: openapi
  lifecycle: production
  owner: petstore@example.com
  definition:
    $text: https://petstore.swagger.io/v2/swagger.json
```

## Common to All Kinds: The Envelope

The root envelope object has the following structure.

### `apiVersion` and `kind` [required]

The `kind` is the high level entity type being described.
[ADR005](../../architecture-decisions/adr005-catalog-core-entities.md) describes
a number of core kinds that plugins can know of and understand, but an
organization using Backstage is free to also add entities of other kinds to the
catalog.

The perhaps most central kind of entity, that the catalog focuses on in the
initial phase, is `Component` ([see below](#kind-component)).

The `apiVersion` is the version of specification format for that particular
entity that the specification is made against. The version is used for being
able to evolve the format, and the tuple of `apiVersion` and `kind` should be
enough for a parser to know how to interpret the contents of the rest of the
data.

Backstage specific entities have an `apiVersion` that is prefixed with
`backstage.io/`, to distinguish them from other types of object that share the
same type of structure. This may be relevant when co-hosting these
specifications with e.g. Kubernetes object manifests, or when an organization
adds their own specific kinds of entity to the catalog.

Early versions of the catalog will be using alpha/beta versions, e.g.
`backstage.io/v1alpha1`, to signal that the format may still change. After that,
we will be using `backstage.io/v1` and up.

### `metadata` [required]

A structure that contains metadata about the entity, i.e. things that aren't
directly part of the entity specification itself. See below for more details
about this structure.

### `spec` [varies]

The actual specification data that describes the entity.

The precise structure of the `spec` depends on the `apiVersion` and `kind`
combination, and some kinds may not even have a `spec` at all. See further down
in this document for the specification structure of specific kinds.

## Common to All Kinds: The Metadata

The `metadata` root field has a number of reserved fields with specific meaning,
described below.

In addition to these, you may add any number of other fields directly under
`metadata`, but be aware that general plugins and tools may not be able to
understand their semantics.

### `name` [required]

The name of the entity. This name is both meant for human eyes to recognize the
entity, and for machines and other components to reference the entity (e.g. in
URLs or from other entity specification files).

Names must be unique per kind, within a given namespace (if specified), at any
point in time. Names may be reused at a later time, after an entity is deleted
from the registry.

Names are required to follow a certain format. Entities that do not follow those
rules will not be accepted for registration in the catalog. The ruleset is
configurable to fit your organization's needs, but the default behavior is as
follows.

- Strings of length at least 1, and at most 63
- Must consist of sequences of `[a-z0-9A-Z]` possibly separated by one of
  `[-_.]`

Example: `visits-tracking-service`, `CircleciBuildsDump_avro_gcs`

In addition to this, names are passed through a normalization function and then
compared to the same normalized form of other entity names and made sure to not
collide. This rule of uniqueness exists to avoid situations where e.g. both
`my-component` and `MyComponent` are registered side by side, which leads to
confusion and risk. The normalization function is also configurable, but the
default behavior is as follows.

- Strip out all characters outside of the set `[a-zA-Z0-9]`
- Convert to lowercase

Example: `CircleciBuildsDs_avro_gcs` -> `circlecibuildsdsavrogcs`

### `namespace` [optional]

The ID of a namespace that the entity belongs to. This is a string that follows
the same format restrictions as `name` above.

This field is optional, and currently has no special semantics apart from
bounding the name uniqueness constraint if specified. It is reserved for future
use and may get broader semantic implication later. For now, it is recommended
to not specify a namespace unless you have specific need to do so.

Namespaces may also be part of the catalog, and are `v1` / `Namespace` entities,
i.e. not Backstage specific but the same as in Kubernetes.

### `description` [optional]

A human readable description of the entity, to be shown in Backstage. Should be
kept short and informative, suitable to give an overview of the entity's purpose
at a glance. More detailed explanations and documentation should be placed
elsewhere.

### `labels` [optional]

Labels are optional key/value pairs of that are attached to the entity, and
their use is identical to
[Kubernetes object labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/).

Their main purpose is for references to other entities, and for information that
is in one way or another classifying for the current entity. They are often used
as values in queries or filters.

Both the key and the value are strings, subject to the following restrictions.

Keys have an optional prefix followed by a slash, and then the name part which
is required. The prefix, if present, must be a valid lowercase domain name, at
most 253 characters in total. The name part must be sequences of `[a-zA-Z0-9]`
separated by any of `[-_.]`, at most 63 characters in total.

The `backstage.io/` prefix is reserved for use by Backstage core components.
Some keys such as `system` also have predefined semantics.

Values are strings that follow the same restrictions as `name` above.

### `annotations` [optional]

An object with arbitrary non-identifying metadata attached to the entity,
identical in use to
[Kubernetes object annotations](https://kubernetes.io/docs/concepts/overview/working-with-objects/annotations/).

Their purpose is mainly, but not limited, to reference into external systems.
This could for example be a reference to the git ref the entity was ingested
from, to monitoring and logging systems, to pagerduty schedules, etc. Users may
add these to descriptor YAML files, but in addition to this automated systems
may also add annotations, either during ingestion into the catalog, or at a
later time.

Both the key and the value are strings, subject to the following restrictions.

Keys have an optional prefix followed by a slash, and then the name part which
is required. The prefix must be a valid lowercase domain name if specified, at
most 253 characters in total. The name part must be sequences of `[a-zA-Z0-9]`
separated by any of `[-_.]`, at most 63 characters in total.

The `backstage.io/` prefix is reserved for use by Backstage core components.

Values can be of any length, but are limited to being strings.

There is a list of [well-known annotations](well-known-annotations.md), but
anybody is free to add more annotations as they see fit.

### `tags` [optional]

A list of single-valued strings, for example to classify catalog entities in
various ways. This is different to the labels in metadata, as labels are
key-value pairs.

The values are user defined, for example the programming language used for the
component, like `java` or `go`.

This field is optional, and currently has no special semantics.

Each tag must be sequences of `[a-z0-9]` separated by `-`, at most 63 characters
in total.

## Common to All Kinds: Relations

The `relations` root field is a read-only list of relations, between the current
entity and other entities, described in the
[well-known relations section](well-known-relations.md). Relations are commonly
two-way, so that there's a pair of relation types each describing one direction
of the relation.

A relation as part of a single entity that's read out of the API may look as
follows.

```js
{
  // ...
  "relations": [
    {
      "target": {
        "kind": "group",
        "namespace": "default",
        "name": "dev.infra"
      },
      "type": "ownedBy"
    }
  ],
  "spec": {
    "owner": "dev.infra",
    // ...
  }
}
```

The fields of a relation are:

| Field      | Type   | Description                                                                      |
| ---------- | ------ | -------------------------------------------------------------------------------- |
| `target`   | Object | A complete [compound reference](references.md) to the other end of the relation. |
| `type`     | String | The type of relation FROM a source entity TO the target entity.                  |
| `metadata` | Object | Reserved for future use.                                                         |

Entity descriptor YAML files are not supposed to contain this field. Instead,
catalog processors analyze the entity descriptor data and its surroundings, and
deduce relations that are then attached onto the entity as read from the
catalog.

Where relations are produced, they are to be considered the authoritative source
for that piece of data. In the example above, a plugin would do better to
consume the relation rather than `spec.owner` for deducing the owner of the
entity, because it may even be the case that the owner isn't taken from the YAML
at all - it could be taken from a CODEOWNERS file nearby instead for example.
Also, the `spec.owner` is on a shortened form and may have semantics associated
with it (such as the default kind being `Group` if not specified).

See the [well-known relations section](well-known-relations.md) for a list of
well-known / common relations and their semantics.

## Kind: Component

Describes the following entity kind:

| Field        | Value                   |
| ------------ | ----------------------- |
| `apiVersion` | `backstage.io/v1alpha1` |
| `kind`       | `Component`             |

A Component describes a software component. It is typically intimately linked to
the source code that constitutes the component, and should be what a developer
may regard a "unit of software", usually with a distinct deployable or linkable
artifact.

Descriptor files for this kind may look as follows.

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: artist-web
  description: The place to be, for great artists
spec:
  type: website
  lifecycle: production
  owner: artist-relations@example.com
  providesApis:
    - artist-api
```

In addition to the [common envelope metadata](#common-to-all-kinds-the-metadata)
shape, this kind has the following structure.

### `apiVersion` and `kind` [required]

Exactly equal to `backstage.io/v1alpha1` and `Component`, respectively.

### `spec.type` [required]

The type of component as a string, e.g. `website`. This field is required.

The software catalog accepts any type value, but an organization should take
great care to establish a proper taxonomy for these. Tools including Backstage
itself may read this field and behave differently depending on its value. For
example, a website type component may present tooling in the Backstage interface
that is specific to just websites.

The current set of well-known and common values for this field is:

- `service` - a backend service, typically exposing an API
- `website` - a website
- `library` - a software library, such as an npm module or a Java library

### `spec.lifecycle` [required]

The lifecycle state of the component, e.g. `production`. This field is required.

The software catalog accepts any lifecycle value, but an organization should
take great care to establish a proper taxonomy for these.

The current set of well-known and common values for this field is:

- `experimental` - an experiment or early, non-production component, signaling
  that users may not prefer to consume it over other more established
  components, or that there are low or no reliability guarantees
- `production` - an established, owned, maintained component
- `deprecated` - a component that is at the end of its lifecycle, and may
  disappear at a later point in time

### `spec.owner` [required]

The owner of the component, e.g. `artist-relations@example.com`. This field is
required.

In Backstage, the owner of a component is the singular entity (commonly a team)
that bears ultimate responsibility for the component, and has the authority and
capability to develop and maintain it. They will be the point of contact if
something goes wrong, or if features are to be requested. The main purpose of
this field is for display purposes in Backstage, so that people looking at
catalog items can get an understanding of to whom this component belongs. It is
not to be used by automated processes to for example assign authorization in
runtime systems. There may be others that also develop or otherwise touch the
component, but there will always be one ultimate owner.

Apart from being a string, the software catalog leaves the format of this field
open to implementers to choose. Most commonly, it is set to the ID or email of a
group of people in an organizational structure.

### `spec.providesApis` [optional]

Links APIs that are provided by the component, e.g. `artist-api`. This field is
optional.

The software catalog expects a list of one or more strings that references the
names of other entities of the `kind` `API`.

### `spec.consumesApis` [optional]

Links APIs that are consumed by the component, e.g. `artist-api`. This field is
optional.

The software catalog expects a list of one or more strings that references the
names of other entities of the `kind` `API`.

## Kind: Template

Describes the following entity kind:

| Field        | Value                   |
| ------------ | ----------------------- |
| `apiVersion` | `backstage.io/v1alpha1` |
| `kind`       | `Template`              |

A Template describes a skeleton for use with the Scaffolder. It is used for
describing what templating library is supported, and also for documenting the
variables that the template requires using
[JSON Forms Schema](https://jsonforms.io/).

Descriptor files for this kind may look as follows.

```yaml
apiVersion: backstage.io/v1alpha1
kind: Template
metadata:
  name: react-ssr-template
  title: React SSR Template
  description:
    Next.js application skeleton for creating isomorphic web applications.
  tags:
    - recommended
    - react
spec:
  owner: web@example.com
  templater: cookiecutter
  type: website
  path: '.'
  schema:
    required:
      - component_id
      - description
    properties:
      component_id:
        title: Name
        type: string
        description: Unique name of the component
      description:
        title: Description
        type: string
        description: Description of the component
```

In addition to the [common envelope metadata](#common-to-all-kinds-the-metadata)
shape, this kind has the following structure.

### `apiVersion` and `kind` [required]

Exactly equal to `backstage.io/v1alpha1` and `Template`, respectively.

### `metadata.title` [required]

The nice display name for the template as a string, e.g. `React SSR Template`.
This field is required as is used to reference the template to the user instead
of the `metadata.name` field.

### `metadata.tags` [optional]

A list of strings that can be associated with the template, e.g.
`['recommended', 'react']`.

This list will also be used in the frontend to display to the user so you can
potentially search and group templates by these tags.

### `spec.type` [optional]

The type of component as a string, e.g. `website`. This field is optional but
recommended.

The software catalog accepts any type value, but an organization should take
great care to establish a proper taxonomy for these. Tools including Backstage
itself may read this field and behave differently depending on its value. For
example, a website type component may present tooling in the Backstage interface
that is specific to just websites.

The current set of well-known and common values for this field is:

- `service` - a backend service, typically exposing an API
- `website` - a website
- `library` - a software library, such as an npm module or a Java library

### `spec.templater` [required]

The templating library that is supported by the template skeleton as a string,
e.g `cookiecutter`.

Different skeletons will use different templating syntax, so it's common that
the template will need to be run with a particular piece of software.

This key will be used to identify the correct templater which is registered into
the `TemplatersBuilder`.

The values which are available by default are:

- `cookiecutter` - [cookiecutter](https://github.com/cookiecutter/cookiecutter).

### `spec.path` [optional]

The string location where the templater should be run if it is not on the same
level as the `template.yaml` definition, e.g. `./cookiecutter/skeleton`.

This will set the `cwd` when running the templater to the folder path that you
specify relative to the `template.yaml` definition.

This is also particularly useful when you have multiple template definitions in
the same repository but only a single `template.yaml` registered in backstage.

## Kind: API

Describes the following entity kind:

| Field        | Value                   |
| ------------ | ----------------------- |
| `apiVersion` | `backstage.io/v1alpha1` |
| `kind`       | `API`                   |

An API describes an interface that can be exposed by a component. The API can be
defined in different formats, like [OpenAPI](https://swagger.io/specification/),
[AsyncAPI](https://www.asyncapi.com/docs/specifications/latest/),
[GraphQL](https://graphql.org/learn/schema/),
[gRPC](https://developers.google.com/protocol-buffers), or other formats.

Descriptor files for this kind may look as follows.

```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: artist-api
  description: Retrieve artist details
spec:
  type: openapi
  lifecycle: production
  owner: artist-relations@example.com
  definition: |
    openapi: "3.0.0"
    info:
      version: 1.0.0
      title: Artist API
      license:
        name: MIT
    servers:
      - url: http://artist.spotify.net/v1
    paths:
      /artists:
        get:
          summary: List all artists
    ...
```

In addition to the [common envelope metadata](#common-to-all-kinds-the-metadata)
shape, this kind has the following structure.

### `apiVersion` and `kind` [required]

Exactly equal to `backstage.io/v1alpha1` and `API`, respectively.

### `spec.type` [required]

The type of the API definition as a string, e.g. `openapi`. This field is
required.

The software catalog accepts any type value, but an organization should take
great care to establish a proper taxonomy for these. Tools including Backstage
itself may read this field and behave differently depending on its value. For
example, an OpenAPI type API may be displayed using an OpenAPI viewer tooling in
the Backstage interface.

The current set of well-known and common values for this field is:

- `openapi` - An API definition in YAML or JSON format based on the
  [OpenAPI](https://swagger.io/specification/) version 2 or version 3 spec.
- `asyncapi` - An API definition based on the
  [AsyncAPI](https://www.asyncapi.com/docs/specifications/latest/) spec.
- `graphql` - An API definition based on
  [GraphQL schemas](https://spec.graphql.org/) for consuming
  [GraphQL](https://graphql.org/) based APIs.
- `grpc` - An API definition based on
  [Protocol Buffers](https://developers.google.com/protocol-buffers) to use with
  [gRPC](https://grpc.io/).

### `spec.lifecycle` [required]

The lifecycle state of the API, e.g. `production`. This field is required.

The software catalog accepts any lifecycle value, but an organization should
take great care to establish a proper taxonomy for these.

The current set of well-known and common values for this field is:

- `experimental` - an experiment or early, non-production API, signaling that
  users may not prefer to consume it over other more established APIs, or that
  there are low or no reliability guarantees
- `production` - an established, owned, maintained API
- `deprecated` - an API that is at the end of its lifecycle, and may disappear
  at a later point in time

### `spec.owner` [required]

The owner of the API, e.g. `artist-relations@example.com`. This field is
required.

In Backstage, the owner of an API is the singular entity (commonly a team) that
bears ultimate responsibility for the API, and has the authority and capability
to develop and maintain it. They will be the point of contact if something goes
wrong, or if features are to be requested. The main purpose of this field is for
display purposes in Backstage, so that people looking at catalog items can get
an understanding of to whom this API belongs. It is not to be used by automated
processes to for example assign authorization in runtime systems. There may be
others that also develop or otherwise touch the API, but there will always be
one ultimate owner.

Apart from being a string, the software catalog leaves the format of this field
open to implementers to choose. Most commonly, it is set to the ID or email of a
group of people in an organizational structure.

### `spec.definition` [required]

The definition of the API, based on the format defined by `spec.type`. This
field is required.

## Kind: Group

Describes the following entity kind:

| Field        | Value                   |
| ------------ | ----------------------- |
| `apiVersion` | `backstage.io/v1alpha1` |
| `kind`       | `Group`                 |

A group describes an organizational entity, such as for example a team, a
business unit, or a loose collection of people in an interest group. Members of
these groups are modeled in the catalog as kind [`User`](#kind-user).

Descriptor files for this kind may look as follows.

```yaml
apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: infrastructure
  description: The infra business unit
spec:
  type: business-unit
  profile:
    displayName: Infrastructure
    email: infrastructure@example.com
    picture: https://example.com/groups/bu-infrastructure.jpeg
  parent: ops
  children: [backstage, other]
```

In addition to the [common envelope metadata](#common-to-all-kinds-the-metadata)
shape, this kind has the following structure.

### `apiVersion` and `kind` [required]

Exactly equal to `backstage.io/v1alpha1` and `Group`, respectively.

### `spec.type` [required]

The type of group as a string, e.g. `team`. There is currently no enforced set
of values for this field, so it is left up to the adopting organization to
choose a nomenclature that matches their org hierarchy.

Some common values for this field could be:

- `team`
- `business-unit`
- `product-area`
- `root` - as a common virtual root of the hierarchy, if desired

### `spec.profile` [optional]

Optional profile information about the group, mainly for display purposes. All
fields of this structure are also optional. The email would be a group email of
some form, that the group may wish to be used for contacting them. The picture
is expected to be a URL pointing to an image that's representative of the group,
and that a browser could fetch and render on a group page or similar.

### `spec.parent` [optional]

The immediate parent group in the hierarchy, if any. Not all groups must have a
parent; the catalog supports multi-root hierarchies. Groups may however not have
more than one parent.

This field is an
[entity reference](https://backstage.io/docs/features/software-catalog/references),
with the default kind `Group` and the default namespace equal to the same
namespace as the user. Only `Group` entities may be referenced. Most commonly,
this field points to a group in the same namespace, so in those cases it is
sufficient to enter only the `metadata.name` field of that group.

### `spec.children` [required]

The immediate child groups of this group in the hierarchy (whose `parent` field
points to this group). The list must be present, but may be empty if there are
no child groups. The items are not guaranteed to be ordered in any particular
way.

The entries of this array are
[entity references](https://backstage.io/docs/features/software-catalog/references),
with the default kind `Group` and the default namespace equal to the same
namespace as the user. Only `Group` entities may be referenced. Most commonly,
these entries point to groups in the same namespace, so in those cases it is
sufficient to enter only the `metadata.name` field of those groups.

## Kind: User

Describes the following entity kind:

| Field        | Value                   |
| ------------ | ----------------------- |
| `apiVersion` | `backstage.io/v1alpha1` |
| `kind`       | `User`                  |

A user describes a person, such as an employee, a contractor, or similar. Users
belong to [`Group`](#kind-group) entities in the catalog.

These catalog user entries are connected to the way that authentication within
the Backstage ecosystem works. See the [auth](https://backstage.io/docs/auth)
section of the docs for a discussion of these concepts.

Descriptor files for this kind may look as follows.

```yaml
apiVersion: backstage.io/v1alpha1
kind: User
metadata:
  name: jdoe
spec:
  profile:
    displayName: Jenny Doe
    email: jenny-doe@example.com
    picture: https://example.com/staff/jenny-with-party-hat.jpeg
  memberOf: [team-b, employees]
```

In addition to the [common envelope metadata](#common-to-all-kinds-the-metadata)
shape, this kind has the following structure.

### `apiVersion` and `kind` [required]

Exactly equal to `backstage.io/v1alpha1` and `User`, respectively.

### `spec.profile` [optional]

Optional profile information about the user, mainly for display purposes. All
fields of this structure are also optional. The email would be a primary email
of some form, that the user may wish to be used for contacting them. The picture
is expected to be a URL pointing to an image that's representative of the user,
and that a browser could fetch and render on a profile page or similar.

### `spec.memberOf` [required]

The list of groups that the user is a direct member of (i.e., no transitive
memberships are listed here). The list must be present, but may be empty if the
user is not member of any groups. The items are not guaranteed to be ordered in
any particular way.

The entries of this array are
[entity references](https://backstage.io/docs/features/software-catalog/references),
with the default kind `Group` and the default namespace equal to the same
namespace as the user. Only `Group` entities may be referenced. Most commonly,
these entries point to groups in the same namespace, so in those cases it is
sufficient to enter only the `metadata.name` field of those groups.

## Kind: Resource

This kind is not yet defined, but is reserved [for future use](system-model.md).

## Kind: System

This kind is not yet defined, but is reserved [for future use](system-model.md).

## Kind: Domain

This kind is not yet defined, but is reserved [for future use](system-model.md).

## Kind: Location

Describes the following entity kind:

| Field        | Value                   |
| ------------ | ----------------------- |
| `apiVersion` | `backstage.io/v1alpha1` |
| `kind`       | `Location`              |

A location is a marker that references other places to look for catalog data.

Descriptor files for this kind may look as follows.

```yaml
apiVersion: backstage.io/v1alpha1
kind: Location
metadata:
  name: org-data
spec:
  type: url
  targets:
    - http://github.com/myorg/myproject/org-data-dump/catalog-info-staff.yaml
    - http://github.com/myorg/myproject/org-data-dump/catalog-info-consultants.yaml
```

In addition to the [common envelope metadata](#common-to-all-kinds-the-metadata)
shape, this kind has the following structure.

### `apiVersion` and `kind` [required]

Exactly equal to `backstage.io/v1alpha1` and `Location`, respectively.

### `spec.type` [optional]

The single location type, that's common to the targets specified in the spec. If
it is left out, it is inherited from the location type that originally read the
entity data. For example, if you have a `url` type location, that when read
results in a `Location` kind entity with no `spec.type`, then the referenced
targets in the entity will implicitly also be of `url` type. This is useful
because you can define a hierarchy of things in a directory structure using
relative target paths (see below), and it will work out no matter if it's
consumed locally on disk from a `file` location, or as uploaded on a VCS.

### `spec.target` [optional]

A single target as a string. Can be either an absolute path/URL (depending on
the type), or a relative path such as `./details/catalog-info.yaml` which is
resolved relative to the location of this Location entity itself.

### `spec.targets` [optional]

A list of targets as strings. They can all be either absolute paths/URLs
(depending on the type), or relative paths such as `./details/catalog-info.yaml`
which are resolved relative to the location of this Location entity itself.
