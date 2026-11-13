// Which challenges have their own drawn world (opened straight from the hut's trail signs).
export function hasWorld(courseId: string | null | undefined) {
  return courseId === 'vesuvius';
}
