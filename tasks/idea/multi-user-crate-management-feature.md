# Multi-User Crate Management Feature

## Overview

Allow multiple users to collaborate on crate management by implementing role-based permissions, shared crate ownership, and collaborative editing capabilities.

## Problem Statement

Currently, crates are owned by a single user with no ability for collaboration. This creates limitations when:

-   Multiple server administrators need to manage the same crates
-   Teams want to collaborate on crate configuration
-   Server owners want to delegate crate management to moderators
-   Multiple users need to add prizes to the same crate simultaneously

## Proposed Solution

### User Roles and Permissions

**Role Hierarchy:**

1. **Owner** - Full control (create, edit, delete, manage permissions)
2. **Editor** - Can add/edit/delete prizes, cannot manage permissions
3. **Contributor** - Can only add new prizes to existing crates
4. **Viewer** - Read-only access to view crate contents

### Database Schema Changes

**Add new collection: `crate_permissions`**

```javascript
{
  id: string (auto-generated),
  crate_reward_id: string (reference to crate_rewards),
  user_id: string (reference to users),
  role: 'owner' | 'editor' | 'contributor' | 'viewer',
  granted_by: string (user_id of who granted permission),
  granted_at: timestamp,
  expires_at: timestamp | null (optional expiration)
}
```

**Update `crate_rewards` collection:**

```javascript
{
  // ... existing fields ...
  is_shared: boolean,           // Whether crate has multiple users
  created_by: string,           // Original creator (always owner)
  last_modified_by: string,     // Last user to modify
  permission_level: 'private' | 'shared' | 'public'
}
```

### UI Implementation

**Crate Management Panel:**

```vue
<!-- Add to CrateSingleView.vue -->
<div v-if="userPermissions.role === 'owner'" class="mb-6">
  <div class="bg-gray-50 p-4 rounded-lg">
    <h3 class="text-lg font-semibold mb-3">Shared Access</h3>

    <!-- Permission Level Toggle -->
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2">Permission Level</label>
      <select v-model="crateForm.permission_level" class="border rounded px-3 py-2">
        <option value="private">Private (Owner Only)</option>
        <option value="shared">Shared (Invited Users)</option>
        <option value="public">Public (All Users Can View)</option>
      </select>
    </div>

    <!-- Add User Modal -->
    <div class="flex justify-between items-center">
      <span class="text-sm text-gray-600">
        {{ sharedUsers.length }} user(s) have access
      </span>
      <button
        @click="showAddUserModal = true"
        class="bg-blue-500 text-white px-3 py-1 rounded text-sm"
      >
        Add User
      </button>
    </div>

    <!-- User List -->
    <div v-if="sharedUsers.length > 0" class="mt-3">
      <div
        v-for="user in sharedUsers"
        :key="user.id"
        class="flex items-center justify-between py-2 border-b last:border-b-0"
      >
        <div class="flex items-center space-x-3">
          <img
            :src="user.avatar || '/default-avatar.png'"
            class="w-8 h-8 rounded-full"
            alt="User avatar"
          />
          <div>
            <div class="font-medium">{{ user.display_name }}</div>
            <div class="text-sm text-gray-500">{{ user.minecraft_username }}</div>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <select
            v-model="user.role"
            @change="updateUserRole(user)"
            class="text-sm border rounded px-2 py-1"
            :disabled="user.role === 'owner'"
          >
            <option value="editor">Editor</option>
            <option value="contributor">Contributor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            v-if="user.role !== 'owner'"
            @click="removeUser(user)"
            class="text-red-500 hover:text-red-700"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
```

**Add User Modal:**

```vue
<!-- BaseModal for adding users -->
<div v-if="showAddUserModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div class="bg-white rounded-lg p-6 w-96 max-w-full">
    <h3 class="text-lg font-semibold mb-4">Add User to Crate</h3>

    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-2">Search Users</label>
        <input
          v-model="userSearchQuery"
          @input="searchUsers"
          placeholder="Search by username or email..."
          class="w-full border rounded px-3 py-2"
        />

        <!-- Search Results -->
        <div v-if="userSearchResults.length > 0" class="mt-2 max-h-32 overflow-y-auto">
          <div
            v-for="user in userSearchResults"
            :key="user.id"
            @click="selectUser(user)"
            class="flex items-center space-x-3 p-2 hover:bg-gray-100 cursor-pointer"
          >
            <img :src="user.avatar || '/default-avatar.png'" class="w-6 h-6 rounded-full" />
            <div>
              <div class="font-medium">{{ user.display_name }}</div>
              <div class="text-sm text-gray-500">{{ user.minecraft_username }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedUser">
        <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded">
          <img :src="selectedUser.avatar || '/default-avatar.png'" class="w-8 h-8 rounded-full" />
          <div>
            <div class="font-medium">{{ selectedUser.display_name }}</div>
            <div class="text-sm text-gray-500">{{ selectedUser.minecraft_username }}</div>
          </div>
        </div>

        <div class="mt-3">
          <label class="block text-sm font-medium mb-2">Role</label>
          <select v-model="newUserRole" class="w-full border rounded px-3 py-2">
            <option value="editor">Editor</option>
            <option value="contributor">Contributor</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
      </div>
    </div>

    <div class="flex justify-end space-x-3 mt-6">
      <button @click="showAddUserModal = false" class="px-4 py-2 border rounded">
        Cancel
      </button>
      <button
        @click="addUserToCrate"
        :disabled="!selectedUser"
        class="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        Add User
      </button>
    </div>
  </div>
</div>
```

### Backend Implementation

**New functions in `src/utils/crateRewards.js`:**

```javascript
/**
 * Add user permission to crate
 */
export async function addCratePermission(crateId, userId, role, grantedBy) {
	try {
		const permission = {
			crate_reward_id: crateId,
			user_id: userId,
			role: role,
			granted_by: grantedBy,
			granted_at: new Date().toISOString(),
			expires_at: null
		}

		const docRef = await addDoc(collection(db, 'crate_permissions'), permission)
		return { id: docRef.id, ...permission }
	} catch (error) {
		console.error('Error adding crate permission:', error)
		throw error
	}
}

/**
 * Update user role in crate
 */
export async function updateCratePermission(permissionId, newRole, updatedBy) {
	try {
		await updateDoc(doc(db, 'crate_permissions', permissionId), {
			role: newRole,
			updated_at: new Date().toISOString(),
			updated_by: updatedBy
		})
		return true
	} catch (error) {
		console.error('Error updating crate permission:', error)
		throw error
	}
}

/**
 * Remove user permission from crate
 */
export async function removeCratePermission(permissionId, removedBy) {
	try {
		await deleteDoc(doc(db, 'crate_permissions', permissionId))

		// Log the removal
		await addDoc(collection(db, 'crate_permission_logs'), {
			permission_id: permissionId,
			action: 'removed',
			removed_by: removedBy,
			removed_at: new Date().toISOString()
		})

		return true
	} catch (error) {
		console.error('Error removing crate permission:', error)
		throw error
	}
}

/**
 * Get user's role for a specific crate
 */
export async function getUserCrateRole(crateId, userId) {
	try {
		const q = query(
			collection(db, 'crate_permissions'),
			where('crate_reward_id', '==', crateId),
			where('user_id', '==', userId)
		)

		const snapshot = await getDocs(q)
		if (snapshot.empty) {
			return null // No permission
		}

		const permission = snapshot.docs[0].data()
		return permission.role
	} catch (error) {
		console.error('Error getting user crate role:', error)
		return null
	}
}

/**
 * Get all users with access to a crate
 */
export async function getCrateUsers(crateId) {
	try {
		const q = query(
			collection(db, 'crate_permissions'),
			where('crate_reward_id', '==', crateId)
		)

		const snapshot = await getDocs(q)
		const permissions = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data()
		}))

		// Fetch user details for each permission
		const usersWithRoles = await Promise.all(
			permissions.map(async (permission) => {
				const userDoc = await getDoc(doc(db, 'users', permission.user_id))
				if (userDoc.exists()) {
					return {
						...permission,
						...userDoc.data()
					}
				}
				return null
			})
		)

		return usersWithRoles.filter((user) => user !== null)
	} catch (error) {
		console.error('Error getting crate users:', error)
		return []
	}
}

/**
 * Check if user can perform action on crate
 */
export function canUserPerformAction(userRole, action) {
	const permissions = {
		owner: [
			'create',
			'edit',
			'delete',
			'manage_permissions',
			'add_prizes',
			'edit_prizes',
			'delete_prizes',
			'view'
		],
		editor: ['edit', 'add_prizes', 'edit_prizes', 'delete_prizes', 'view'],
		contributor: ['add_prizes', 'view'],
		viewer: ['view']
	}

	return permissions[userRole]?.includes(action) || false
}

/**
 * Search users for crate sharing
 */
export async function searchUsersForCrate(query, excludeUserIds = []) {
	try {
		const usersRef = collection(db, 'users')
		let q = query(usersRef, orderBy('display_name'), limit(20))

		const snapshot = await getDocs(q)
		const allUsers = snapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data()
		}))

		// Filter by search query and excluded users
		const filtered = allUsers.filter((user) => {
			const matchesQuery =
				!query ||
				user.display_name?.toLowerCase().includes(query.toLowerCase()) ||
				user.minecraft_username?.toLowerCase().includes(query.toLowerCase())

			const notExcluded = !excludeUserIds.includes(user.id)

			return matchesQuery && notExcluded
		})

		return filtered
	} catch (error) {
		console.error('Error searching users:', error)
		return []
	}
}
```

### Permission Enforcement

**Update existing crate functions to check permissions:**

```javascript
/**
 * Enhanced crate reward item creation with permission check
 */
export async function createCrateRewardItem(crateId, itemData, userId) {
	try {
		// Check user permission
		const userRole = await getUserCrateRole(crateId, userId)
		if (!canUserPerformAction(userRole, 'add_prizes')) {
			throw new Error('Insufficient permissions to add prizes to this crate')
		}

		const rewardItem = {
			...itemData,
			crate_reward_id: crateId,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			created_by: userId
		}

		const docRef = await addDoc(collection(db, 'crate_reward_items'), rewardItem)

		// Update crate's last_modified_by
		await updateDoc(doc(db, 'crate_rewards', crateId), {
			last_modified_by: userId,
			updated_at: new Date().toISOString()
		})

		return { id: docRef.id, ...rewardItem }
	} catch (error) {
		console.error('Error creating crate reward item:', error)
		throw error
	}
}
```

### Activity Logging

**Add activity tracking:**

```javascript
/**
 * Log crate activity
 */
export async function logCrateActivity(crateId, userId, action, details = {}) {
	try {
		const activity = {
			crate_reward_id: crateId,
			user_id: userId,
			action: action, // 'created', 'edited', 'added_prize', 'removed_prize', 'shared', etc.
			details: details,
			timestamp: new Date().toISOString()
		}

		await addDoc(collection(db, 'crate_activities'), activity)
	} catch (error) {
		console.error('Error logging crate activity:', error)
	}
}
```

## Benefits

-   **Collaboration**: Multiple users can work on the same crate simultaneously
-   **Delegation**: Server owners can assign crate management to moderators
-   **Flexibility**: Different permission levels for different use cases
-   **Audit Trail**: Track who made what changes and when
-   **Scalability**: Better management for large servers with multiple administrators

## Use Cases

1. **Server Administration**: Multiple admins managing server crates
2. **Team Collaboration**: Development teams working on crate configurations
3. **Moderator Delegation**: Server owners giving limited crate access to moderators
4. **Content Creation**: Multiple users contributing prizes to community crates
5. **Review Process**: Editors reviewing and approving contributor additions

## Implementation Priority

**High** - Core functionality that significantly improves collaboration and usability for multi-user environments.

## Related Features

-   User authentication and profiles
-   Crate reward management
-   Permission system
-   Activity logging
-   User search and discovery

## Technical Considerations

-   **Performance**: Efficient permission checking without excessive database queries
-   **Security**: Proper validation of permission changes and user actions
-   **Concurrency**: Handle simultaneous edits without conflicts
-   **Data Integrity**: Ensure permissions are properly maintained during crate operations
-   **User Experience**: Clear indication of user roles and permissions in the UI
-   **Migration**: Existing crates should default to private with owner-only access
