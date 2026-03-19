import { pgTable, text, uuid, jsonb, timestamp, pgEnum, boolean } from 'drizzle-orm/pg-core'

// Enum para status da sessão de revisão
export const sessionStatusEnum = pgEnum('session_status', [
  'pending',      // aguardando o cliente preencher
  'in_review',    // cliente está anotando
  'submitted',    // cliente enviou as anotações
  'processing',   // gerando PDF e disparando notificações
  'completed',    // processo concluído
])

// Enum para tipo de anotação
export const annotationTypeEnum = pgEnum('annotation_type', [
  'drawing',    // desenho livre
  'arrow',      // seta
  'textbox',    // caixa de texto
])

// Tabela de sessões de revisão
export const reviewSessions = pgTable('review_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  token: uuid('token').defaultRandom().notNull().unique(),
  projectLink: text('project_link').notNull(),
  clientPhone: text('client_phone'),
  projectName: text('project_name'),
  screenshotPath: text('screenshot_path'),
  pdfPath: text('pdf_path'),
  status: sessionStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Tabela de anotações individuais
export const annotations = pgTable('annotations', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id')
    .notNull()
    .references(() => reviewSessions.id, { onDelete: 'cascade' }),
  type: annotationTypeEnum('type').notNull(),
  // JSON completo do objeto Fabric.js
  data: jsonb('data').notNull(),
  // Descrição textual da anotação (extraída do textbox ou gerada automaticamente)
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Tipos TypeScript inferidos do schema
export type ReviewSession = typeof reviewSessions.$inferSelect
export type NewReviewSession = typeof reviewSessions.$inferInsert
export type Annotation = typeof annotations.$inferSelect
export type NewAnnotation = typeof annotations.$inferInsert

// Tabela de OTPs para autenticação do admin
export const adminOtps = pgTable('admin_otps', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull(),
  used: boolean('used').default(false).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type AdminOtp = typeof adminOtps.$inferSelect
export type NewAdminOtp = typeof adminOtps.$inferInsert
