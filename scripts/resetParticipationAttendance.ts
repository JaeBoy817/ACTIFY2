import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
});

async function main() {
  const [residentsBefore, attendanceBefore, seedActivitiesBefore, seedSeriesBefore] = await Promise.all([
    prisma.resident.count(),
    prisma.attendance.count(),
    prisma.activityInstance.count({
      where: {
        id: {
          startsWith: "seed_"
        }
      }
    }),
    prisma.activitySeries.count({
      where: {
        id: {
          startsWith: "seed_"
        }
      }
    })
  ]);

  console.log("Resetting participation and attendance data...");
  console.log(
    JSON.stringify(
      {
        residentsBefore,
        attendanceBefore,
        seedActivitiesBefore,
        seedSeriesBefore
      },
      null,
      2
    )
  );

  const [deletedAttendance, deletedSeedActivities, deletedSeedSeries] = await prisma.$transaction([
    prisma.attendance.deleteMany(),
    prisma.activityInstance.deleteMany({
      where: {
        id: {
          startsWith: "seed_"
        }
      }
    }),
    prisma.activitySeries.deleteMany({
      where: {
        id: {
          startsWith: "seed_"
        }
      }
    })
  ]);

  const [residentsAfter, attendanceAfter, lingeringAttendanceByResident] = await Promise.all([
    prisma.resident.count(),
    prisma.attendance.count(),
    prisma.attendance.groupBy({
      by: ["residentId"],
      _count: {
        _all: true
      }
    })
  ]);

  console.log("Participation reset complete.");
  console.log(
    JSON.stringify(
      {
        deletedAttendance: deletedAttendance.count,
        deletedSeedActivities: deletedSeedActivities.count,
        deletedSeedSeries: deletedSeedSeries.count,
        residentsBefore,
        residentsAfter,
        attendanceAfter,
        lingeringResidentAttendanceRows: lingeringAttendanceByResident.length
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Failed to reset participation data.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
