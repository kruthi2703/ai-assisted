MAX_MARKS_PER_SUBJECT = 100

students = {
    "Student 1": {
        "Science": 80,
        "Maths": 77,
        "English": 88,
    }
}


def get_letter_grade(percentage):
    if percentage >= 90:
        return "A"
    if percentage >= 80:
        return "B"
    if percentage >= 70:
        return "C"
    if percentage >= 60:
        return "D"
    return "F"


for student_name, subject_marks in students.items():
    total_marks = sum(subject_marks.values())
    maximum_total = len(subject_marks) * MAX_MARKS_PER_SUBJECT
    percentage = total_marks / maximum_total * 100
    grade = get_letter_grade(percentage)

    print(f"{student_name}:")
    print(f"  Total: {total_marks}/{maximum_total}")
    print(f"  Percentage: {percentage:.2f}%")
    print(f"  Grade: {grade}") 