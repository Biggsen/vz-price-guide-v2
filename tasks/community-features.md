# Community Features - User Interaction & Feedback

## Overview

Implement community features to enable user interaction, feedback, and collaboration. This builds on the user accounts fundamentals and enhances the platform's community aspect.

Current decisions for a minimal, pragmatic path:

-   Keep a single flow for input. Use the existing suggestions feature and add a `category` to capture feedback type (`bug | feature | general`).
-   Defer separate feedback routes, rich editors, attachments, and analytics until submission volume grows.
-   Defer suggestion tagging for now; categories are sufficient at low volume.
-   Tie feature request voting to `data/roadmap.json` using a lightweight Firestore vote store. Avoid migrating roadmap content until in-app editing is needed.
-   Keep `data/updates.json` as static; migrate only if you want admin editing or commentary.

## Dependencies

### Prerequisites

-   ✅ User Accounts Feature (registration, authentication, profiles)
-   ✅ Shop Manager Feature (existing)
-   ✅ Custom Price Guide Feature (roadmap item #12)

### User Profiles Analysis

Based on `docs/user-profiles.md`, the community features should serve:

**Primary Users:**

-   **Shop Owners** (Rachel) - Need competitor insights and market data
-   **Deal Hunters** (Greg) - Want price comparisons and deal tracking
-   **Server Admins** (Sarah) - Need economic oversight and moderation tools
-   **Hardcore Traders** (Lisa) - Want advanced market analysis and collaboration

**Secondary Users:**

-   **Economy Consultants** (Dr. Chen) - Need comprehensive data analysis
-   **Content Creators** (Emma) - Want research tools and community insights
-   **Guild Leaders** (Tom) - Need coordination and bulk purchase features

---

## Implementation Plan

### Phase 1: Suggestions & Feedback (Combined, Minimal)

Current stance: no large changes until volume increases. Make the smallest edits that unlock triage and prioritisation.

#### Task 1.1: Add Category to Suggestions

-   [ ] Extend existing `suggestions` docs with `category: 'bug' | 'feature' | 'general'`.
-   [ ] Add a category select to the `/suggestions` form.
-   [ ] Add an optional category filter to the admin view at `/suggestions/all`.

#### Task 1.2: Roadmap Voting (Lightweight)

-   [ ] Keep `data/roadmap.json` as the source of truth for roadmap items.
-   [ ] Create a Firestore vote store keyed by `roadmapId` that aggregates vote counts and prevents duplicate user votes.
-   [ ] Client reads roadmap from JSON and merges Firestore vote totals.
-   [ ] No in-app CRUD for roadmap items yet; editing remains in JSON.

### Phase 2: Community Price Sharing

#### Task 2.1: Public Price Guides

-   [ ] Extend Custom Price Guide feature for sharing
-   [ ] Public/private toggle for price guides
-   [ ] Guide discovery and search
-   [ ] Guide ratings and reviews
-   [ ] Guide following/subscription system
-   [ ] Attribution and credit system

#### Task 2.2: Community Price Validation

-   [ ] Price accuracy voting system
-   [ ] Trust scores for price contributors
-   [ ] Price verification badges
-   [ ] Community moderation tools
-   [ ] Price dispute resolution system
-   [ ] Automated price anomaly detection

#### Task 2.3: Collaborative Price Guides

-   [ ] Multi-user price guide editing
-   [ ] Version control for price changes
-   [ ] Change approval workflow
-   [ ] Contributor roles and permissions
-   [ ] Change history and audit trail

### Phase 3: Community Forums & Discussions

#### Task 3.1: Discussion Forums

-   [ ] Create forum structure (categories, topics, threads)
-   [ ] Forum moderation tools
-   [ ] User reputation system
-   [ ] Thread tagging and categorization
-   [ ] Search and filtering capabilities
-   [ ] Mobile-responsive forum design

#### Task 3.2: Community Moderation

-   [ ] User reporting system
-   [ ] Moderation queue and tools
-   [ ] User suspension/banning
-   [ ] Content filtering and spam protection
-   [ ] Community guidelines enforcement
-   [ ] Appeal and review process

#### Task 3.3: Community Engagement

-   [ ] User badges and achievements
-   [ ] Community leaderboards
-   [ ] Weekly/monthly community highlights
-   [ ] Community events and challenges
-   [ ] User-generated content showcase

### Phase 4: Advanced Collaboration Features

#### Task 4.1: Guild/Clan Features

-   [ ] Guild creation and management
-   [ ] Guild member roles and permissions
-   [ ] Guild price guides and strategies
-   [ ] Guild trading coordination tools
-   [ ] Guild analytics and reporting
-   [ ] Inter-guild collaboration features

#### Task 4.2: Market Intelligence

-   [ ] Community market reports
-   [ ] Price trend analysis and predictions
-   [ ] Market volatility alerts
-   [ ] Trading opportunity notifications
-   [ ] Economic health indicators
-   [ ] Server economy comparisons

#### Task 4.3: Expert Network

-   [ ] Expert verification system
-   [ ] Expert consultation marketplace
-   [ ] Knowledge sharing platform
-   [ ] Mentorship programs
-   [ ] Expert content creation tools
-   [ ] Expert reputation management

---

## Technical Requirements

### Database Schema

#### Suggestions extension (combined with feedback)

```javascript
// suggestions collection (existing; additions shown)
{
	// ...existing fields...
	category: 'bug' | 'feature' | 'general' // NEW: combines feedback + suggestions
}
```

#### Roadmap voting (JSON + Firestore votes)

```javascript
// roadmap_votes collection (doc id = roadmapId from data/roadmap.json)
{
  id: string,             // roadmapId, e.g. 'R12'
  votes: number,          // aggregate count
  voters: { [uid]: true } // map for O(1) duplicate prevention
}
```

#### Community Features

```javascript
// community_posts collection
{
  id: string,
  user_id: string,
  type: 'forum_post' | 'guide_review' | 'market_report',
  title: string,
  content: string,
  category: string,
  tags: string[],
  likes: number,
  dislikes: number,
  views: number,
  status: 'active' | 'moderated' | 'deleted',
  created_at: timestamp,
  updated_at: timestamp
}

// user_reputation collection
{
  id: string,
  user_id: string,
  trust_score: number,
  contribution_score: number,
  badges: string[],
  moderation_level: 'user' | 'moderator' | 'admin',
  reputation_history: [{
    action: string,
    points: number,
    timestamp: timestamp
  }]
}
```

### Routes

No new routes required for Phase 1.

Existing:

```
/suggestions               - Combined suggestions & feedback (user)
/suggestions/all           - Suggestions admin view
```

Optional (for voting UI integration):

```
/roadmap                   - Read roadmap.json, merge with Firestore vote totals
```

### Security Rules

```javascript
// Add to firestore.rules:

// Suggestions (ensure users can only write their own)
match /suggestions/{suggestionId} {
  allow read: if request.auth != null && (
    request.auth.uid == resource.data.userId ||
    request.auth.token.admin == true
  );
  allow create: if request.auth != null;
  allow update: if request.auth != null && (
    request.auth.uid == resource.data.userId ||
    request.auth.token.admin == true
  );
}

// Roadmap votes (one vote per user per roadmapId)
match /roadmap_votes/{roadmapId} {
  allow read: if true;
  allow create, update: if request.auth != null && (
    // allow setting current user's vote if not previously set
    !(resource.data.voters[request.auth.uid] == true) &&
    request.resource.data.voters[request.auth.uid] == true
  );
}
```

---

## User Experience Design

### Feedback System UX

-   **Easy Access**: Feedback button in header/navigation
-   **Guided Submission**: Step-by-step feedback wizard
-   **Context Capture**: Automatic capture of user context
-   **Status Updates**: Email notifications for feedback status
-   **Response System**: Admin responses visible to users

### Community Features UX

-   **Gamification**: Badges, points, leaderboards
-   **Social Proof**: User reputation and trust scores
-   **Discovery**: Easy discovery of community content
-   **Moderation**: Clear community guidelines and enforcement
-   **Mobile-First**: Responsive design for all devices

### Collaboration UX

-   **Permission Management**: Clear role definitions
-   **Version Control**: Transparent change tracking
-   **Conflict Resolution**: Tools for resolving disagreements
-   **Communication**: Built-in messaging and notifications

---

## Success Metrics

### Community Engagement

-   [ ] Active community members (daily/weekly/monthly)
-   [ ] User-generated content volume
-   [ ] Community interaction rates
-   [ ] User retention and return rates

### Feedback Quality

-   [ ] Feedback response time
-   [ ] Feature request implementation rate
-   [ ] User satisfaction with feedback system
-   [ ] Bug report resolution rate

### Community Health

-   [ ] Moderation effectiveness
-   [ ] Community guideline compliance
-   [ ] User reputation accuracy
-   [ ] Spam and abuse prevention

### Business Impact

-   [ ] User acquisition through community
-   [ ] Feature adoption rates
-   [ ] User lifetime value increase
-   [ ] Platform stickiness and engagement

---

## Implementation Priority

### High Priority (Phase 1-2)

1. **Suggestions Category** – Minimal combined flow improvement
2. **Roadmap Voting (Lightweight)** – Community input without migration
3. **Public Price Guides** – Core value proposition (when ready)
4. **Basic Moderation** – As volume requires

### Medium Priority (Phase 3)

1. **Discussion Forums** - Community building
2. **Advanced Moderation** - Scale management
3. **User Reputation** - Trust building

### Low Priority (Phase 4)

1. **Guild Features** - Advanced collaboration
2. **Market Intelligence** - Expert features
3. **Expert Network** - Premium features

---

## Risk Mitigation

### Community Management

-   **Moderation Tools**: Comprehensive moderation capabilities
-   **Community Guidelines**: Clear rules and enforcement
-   **Escalation Process**: Clear process for handling issues
-   **User Education**: Guidelines and best practices

### Technical Risks

-   **Scalability**: Design for growth from day one
-   **Performance**: Optimize for large community
-   **Security**: Protect user data and prevent abuse
-   **Backup**: Regular data backups and recovery

### Content Quality

-   **Quality Control**: Mechanisms to maintain content quality
-   **Spam Prevention**: Automated and manual spam detection
-   **Duplicate Detection**: Prevent duplicate content
-   **Content Moderation**: Review and approval workflows

---

## Future Enhancements

### Advanced Features

-   **AI-Powered Moderation**: Automated content filtering
-   **Community Analytics**: Advanced community insights
-   **Integration APIs**: Third-party integrations
-   **Mobile App**: Native mobile community app

### Monetization Opportunities

-   **Premium Memberships**: Enhanced community features
-   **Expert Consultations**: Paid expert advice
-   **Market Reports**: Premium market intelligence
-   **Advertising**: Community-targeted advertising

### Platform Expansion

-   **Multi-Language Support**: International community
-   **Regional Communities**: Server-specific communities
-   **Cross-Platform Integration**: Discord, Reddit, etc.
-   **API Access**: Third-party community tools

---

Notes on data sources:

-   `data/roadmap.json` remains authoritative for roadmap content in the lightweight phase; Firestore stores only vote state.
-   `data/updates.json` remains a static historical log. Consider migration only if admin editing or commentary features are required.
