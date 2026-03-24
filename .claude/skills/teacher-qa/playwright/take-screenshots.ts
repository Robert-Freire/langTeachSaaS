import { chromium } from '@playwright/test'
import { createQAAuthContext } from './helpers/auth'
import { config } from 'dotenv'
import path from 'path'

config({ path: path.resolve(__dirname, '../../../..', '.env.qa') })

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5175'
const outDir = path.resolve(__dirname, '../output/sprint-screenshots')

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await createQAAuthContext(browser)
  const page = await context.newPage()
  page.setViewportSize({ width: 1440, height: 900 })

  const fs = await import('fs')
  fs.mkdirSync(outDir, { recursive: true })

  // 1. Dashboard
  await page.goto(`${baseURL}/dashboard`)
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: path.join(outDir, '01-dashboard.png'), fullPage: false })
  console.log('1. Dashboard captured')

  // 2. Students list
  const [studentsResp] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/students') && r.status() === 200 && r.request().resourceType() === 'xhr'),
    page.goto(`${baseURL}/students`)
  ])
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: path.join(outDir, '02-students.png'), fullPage: false })
  console.log('2. Students list captured')

  // 3. Student form with difficulties/weaknesses - find a QA student
  const studentCard = page.locator('text=[QA]').first()
  if (await studentCard.isVisible()) {
    await studentCard.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(outDir, '03-student-profile.png'), fullPage: true })
    console.log('3. Student profile captured')
  }

  // 4. Courses page (curriculum templates)
  const [coursesResp] = await Promise.all([
    page.waitForResponse(r => r.url().includes('/api/courses') && r.status() === 200 && r.request().resourceType() === 'xhr'),
    page.goto(`${baseURL}/courses`)
  ])
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: path.join(outDir, '04-courses.png'), fullPage: false })
  console.log('4. Courses page captured')

  // 5. New course page (shows curriculum templates)
  await page.goto(`${baseURL}/courses/new`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: path.join(outDir, '05-course-new.png'), fullPage: true })
  console.log('5. New course page captured')

  // 6. New lesson page (shows auto-fill from student)
  await page.goto(`${baseURL}/lessons/new`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: path.join(outDir, '06-lesson-new.png'), fullPage: false })
  console.log('6. New lesson page captured')

  // 7. Pick a student to show auto-fill
  const studentSelect = page.locator('[data-testid="student-select"], select, [role="combobox"]').first()
  if (await studentSelect.isVisible()) {
    await studentSelect.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(outDir, '07-lesson-new-student-select.png'), fullPage: false })
    console.log('7. Student select dropdown captured')
  }

  // 8. Lessons list
  await page.goto(`${baseURL}/lessons`)
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: path.join(outDir, '08-lessons.png'), fullPage: false })
  console.log('8. Lessons list captured')

  // 9. Open a generated lesson to show content quality
  const lessonLink = page.locator('a[href*="/lessons/"]').first()
  if (await lessonLink.isVisible()) {
    await lessonLink.click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(outDir, '09-lesson-editor.png'), fullPage: false })
    console.log('9. Lesson editor captured')

    // Scroll down to show more content
    await page.evaluate(() => window.scrollBy(0, 800))
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(outDir, '10-lesson-editor-scrolled.png'), fullPage: false })
    console.log('10. Lesson editor scrolled captured')

    // Student view
    const previewBtn = page.locator('text=Preview as Student')
    if (await previewBtn.isVisible()) {
      await previewBtn.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      await page.screenshot({ path: path.join(outDir, '11-student-view.png'), fullPage: false })
      console.log('11. Student view captured')

      await page.evaluate(() => window.scrollBy(0, 600))
      await page.waitForTimeout(500)
      await page.screenshot({ path: path.join(outDir, '12-student-view-scrolled.png'), fullPage: false })
      console.log('12. Student view scrolled captured')
    }
  }

  await browser.close()
  console.log(`\nAll screenshots saved to: ${outDir}`)
}

main().catch(e => { console.error(e); process.exit(1) })
